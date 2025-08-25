const express = require('express');
const sweph = require('sweph');
const cors = require('cors');

// Importar nosso dicionário de constantes
const {
    SE_SUN, SE_MOON, SE_MERCURY, SE_VENUS, SE_MARS, SE_JUPITER, SE_SATURN,
    SE_URANUS, SE_NEPTUNE, SE_PLUTO, SE_TRUE_NODE, SE_CHIRON, SEFLG_SPEED
} = require('./constants');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());

// Configura o caminho para os arquivos de efemérides do sweph
sweph.set_ephe_path(__dirname + '/node_modules/sweph/ephe');

// --- FUNÇÃO AUXILIAR PARA PROMISE COM SWE_HOUSES ---
const { promisify } = require('util');
const swe_houses_async = promisify(sweph.swe_houses);

// Função para calcular casas
const calculateHouses = async (julianDay, lat, lon, houseSystem = 'P') => {
    // 'P' = Placidus, outros: 'K'=Koch, 'R'=Regiomontanus, etc.
    const result = await swe_houses_async(julianDay, 0, lat, lon, houseSystem);
    return {
        cusps: result.cusps,
        ascendant: result.ascendant,
        mc: result.mc
    };
};

// Rota principal da API
app.post('/calculate', async (req, res) => {
    try {
        console.log("Recebi uma requisição:", req.body);
        const { year, month, day, hour, lat, lon } = req.body;

        if (!year || !month || !day || !hour || !lat || !lon) {
            return res.status(400).json({ error: 'Dados de entrada incompletos.' });
        }

        // --- 1. CÁLCULO DO DIA JULIANO ---
        const jd_ut_obj = await sweph.utc_to_jd(year, month, day, hour, 0, 0, 1);
        const julianDay = jd_ut_obj.data[0];

        // --- 2. CÁLCULO DOS PLANETAS ---
        const planetsToCalc = [
            { id: SE_SUN, name: 'sun' }, { id: SE_MOON, name: 'moon' },
            { id: SE_MERCURY, name: 'mercury' }, { id: SE_VENUS, name: 'venus' },
            { id: SE_MARS, name: 'mars' }, { id: SE_JUPITER, name: 'jupiter' },
            { id: SE_SATURN, name: 'saturn' }, { id: SE_URANUS, name: 'uranus' },
            { id: SE_NEPTUNE, name: 'neptune' }, { id: SE_PLUTO, name: 'pluto' },
            { id: SE_TRUE_NODE, name: 'north_node' }, { id: SE_CHIRON, name: 'chiron' }
        ];

        const calculatedPlanets = {};
        for (const planet of planetsToCalc) {
            const position = await sweph.calc_ut(julianDay, planet.id, SEFLG_SPEED);
            calculatedPlanets[planet.name] = {
                longitude: position.data[0],
                latitude: position.data[1],
                speed: position.data[3]
            };
        }

        // --- 3. CÁLCULO DAS CASAS ---
        const houses = await calculateHouses(julianDay, lat, lon, 'P');

        // --- 4. MONTAR A RESPOSTA FINAL ---
        const responseData = {
            message: "Cálculo de planetas e casas realizado com sucesso!",
            julianDay: julianDay,
            planets: calculatedPlanets,
            houses: {
                ascendant: houses.ascendant,
                mc: houses.mc,
                cusps: houses.cusps
            }
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error("Erro no cálculo:", error);
        res.status(500).json({ error: 'Erro interno ao realizar o cálculo.', details: error.toString() });
    }
});

// Rota de teste para a página inicial
app.get('/', (req, res) => {
    res.send('Servidor astrológico no ar. Use o endpoint POST /calculate para fazer os cálculos.');
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
