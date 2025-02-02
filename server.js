const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

const upload = multer({ dest: 'uploads/' });

mongoose.connect('mongodb://localhost:27017/carbon_tracker');

const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String
}), 'User');

const Carbon = mongoose.model('Carbon', new mongoose.Schema({
    date: { type: String, default: () => new Date().toISOString() },
    emission: Number,
    transport: Number,
    energy: Number,
    water: Number,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}), 'Carbon');

app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'Пользователь зарегистрирован' });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: 'Пользователь не найден' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ message: 'Неверный пароль' });
    }

    const token = jwt.sign({ userId: user._id }, 'secret_key', { expiresIn: '1h' });
    res.json({ token });
});

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Нет авторизации' });

    try {
        const decoded = jwt.verify(token, 'secret_key');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Ошибка авторизации' });
    }
};

app.get('/data', authMiddleware, async (req, res) => {
    const data = await Carbon.find({ userId: req.user.userId });
    res.json(data);
});

app.post('/data', authMiddleware, async (req, res) => {
    const { date, emission, transport, energy, water } = req.body;
    const formattedDate = new Date(date).toLocaleDateString('ru-RU');
    
    const entry = new Carbon({
        date: formattedDate,
        emission,
        transport,
        energy,
        water,
        userId: req.user.userId
    });
    await entry.save();
    res.json(entry);
});

app.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
    const filePath = req.file.path;

    fs.readFile(filePath, 'utf8', async (err, data) => {
        if (err) {
            return res.status(500).send('Ошибка при чтении файла');
        }

        try {
            const newEntries = JSON.parse(data);

            for (const entry of newEntries) {
                const { date, emission, transport, energy, water } = entry;
                const formattedDate = new Date(date).toLocaleDateString('ru-RU');
                
                const carbonEntry = new Carbon({
                    date: formattedDate,
                    emission,
                    transport,
                    energy,
                    water,
                    userId: req.user.userId
                });
                await carbonEntry.save();
            }

            res.status(200).send('Данные успешно загружены');
        } catch (error) {
            res.status(400).send('Неверный формат JSON');
        }
    });
});

app.post('/upload-carbon-footprint', authMiddleware, upload.single('file'), (req, res) => {
    const filePath = req.file.path;

    fs.readFile(filePath, 'utf8', async (err, data) => {
        if (err) {
            return res.status(500).send('Ошибка при чтении файла');
        }

        try {
            const parsedData = JSON.parse(data);

            const { transport, energy, water } = parsedData;
            if (typeof transport !== 'number' || typeof energy !== 'number' || typeof water !== 'number') {
                return res.status(400).send('Неверный формат данных для расчёта углеродного следа');
            }

            res.json({ transport, energy, water });
        } catch (error) {
            res.status(400).send('Неверный формат JSON');
        }
    });
});

app.listen(3000, () => console.log('🚀 Сервер запущен на порту 3000'));
