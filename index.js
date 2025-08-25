const express = require('express');
const sweph = require('sweph');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());

sweph.set_ephe_path(__dirname + '/node_modules/sweph/ephe');

app.post('/calculate', async (req, res) => {
    try {
        const { year, month, day, hour, lat, lon } = req.body;
        if (!year || !month || !day || !hour || !lat || !lon) {
            return res.status(400).json({ error: 'Dados de entrada incompletos.' });
        }
        const jd_ut = await sweph.utc_to_jd(year, month, day, hour, 0, 0, 1);
        const julianDay = jd_ut.julianDayUT;
        console.log('Conteúdo de jd_ut:', jd_ut);
        const sunPosition = await sweph.calc_ut(julianDay, sweph.SE_SUN, sweph.SEFLG_SPEED);
        const responseData = {
            message: "Cálculo realizado com sucesso!",
            julianDay: julianDay,
            sun: {
                longitude: sunPosition.longitude,
                latitude: sunPosition.latitude,
                speed: sunPosition.longitude_speed
            }
        };
        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno ao realizar o cálculo.', details: error.toString() });
    }
});

app.get('/', (req, res) => {
    res.send('Servidor astrológico no ar. Use o endpoint POST /calculate para fazer os cálculos.');
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
