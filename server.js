const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Middleware
app.use(cors());
app.use(express.json());

// Обслуживаем статические файлы из папки public
app.use(express.static(PUBLIC_DIR));

// Корневой маршрут - отдаем HTML из public
app.get('/', (req, res) => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    
    // Проверяем существование файла
    fs.access(indexPath)
        .then(() => {
            res.sendFile(indexPath);
        })
        .catch(() => {
            // Если файл не найден, отправляем сообщение
            res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Ошибка - Файл не найден</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            padding: 40px; 
                            text-align: center; 
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            min-height: 100vh;
                            color: white;
                        }
                        .container { 
                            max-width: 600px; 
                            margin: 100px auto; 
                            background: rgba(255, 255, 255, 0.95); 
                            padding: 40px; 
                            border-radius: 20px; 
                            color: #333;
                        }
                        h1 { color: #e74c3c; }
                        .path { 
                            background: #f8f9fa; 
                            padding: 10px; 
                            border-radius: 5px; 
                            font-family: monospace;
                            margin: 20px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>⚠️ Файл не найден</h1>
                        <p>Файл index.html не найден по пути:</p>
                        <div class="path">${indexPath}</div>
                        <p>Пожалуйста, убедитесь что файл находится в папке <strong>public</strong>.</p>
                        <p>Проверьте доступные маршруты:</p>
                        <ul style="text-align: left; margin: 20px 0;">
                            <li><a href="/api/items">/api/items</a> - Все товары</li>
                            <li><a href="/health">/health</a> - Проверка здоровья</li>
                            <li><a href="/test">/test</a> - Тест сервера</li>
                            <li><a href="/files">/files</a> - Список файлов</li>
                        </ul>
                    </div>
                </body>
                </html>
            `);
        });
});

// Загружаем данные из файла (или создаем новый)
async function loadData() {
    try {
        // Проверяем, существует ли файл
        try {
            await fs.access(DATA_FILE);
        } catch {
            // Файла нет - создаем с демо-данными
            const demoData = getDemoData();
            await saveData(demoData);
            return demoData;
        }
        
        // Читаем существующий файл
        const data = await fs.readFile(DATA_FILE, 'utf8');
        
        // Проверяем, не пустой ли файл
        if (!data.trim()) {
            const demoData = getDemoData();
            await saveData(demoData);
            return demoData;
        }
        
        return JSON.parse(data);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        // Возвращаем демо-данные в случае ошибки
        return getDemoData();
    }
}

// Демо-данные по умолчанию
function getDemoData() {
    return [
        { 
            id: 1, 
            name: "Черная футболка Premium", 
            image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop&crop=center",
            sizes: { S: 15, M: 22, L: 18, XL: 10, XXL: 5 }
        },
        { 
            id: 2, 
            name: "Синие джинсы Slim Fit", 
            image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&h=500&fit=crop&crop=center",
            sizes: { S: 8, M: 25, L: 30, XL: 15, XXL: 7 }
        },
        { 
            id: 3, 
            name: "Красное вечернее платье", 
            image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&h=500&fit=crop&crop=center",
            sizes: { S: 12, M: 20, L: 15, XL: 8, XXL: 3 }
        },
        { 
            id: 4, 
            name: "Белая рубашка офисная", 
            image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&h=500&fit=crop&crop=center",
            sizes: { S: 10, M: 18, L: 22, XL: 12, XXL: 6 }
        }
    ];
}

// Сохраняем данные в файл
async function saveData(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('Данные сохранены в файл');
        return true;
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
        return false;
    }
}

// Генерируем новый ID
function generateId(items) {
    const maxId = items.reduce((max, item) => Math.max(max, item.id || 0), 0);
    return maxId + 1;
}

// ========== API РОУТЫ ==========

// Получить все товары
app.get('/api/items', async (req, res) => {
    try {
        console.log('GET /api/items - Запрос всех товаров');
        const data = await loadData();
        res.json(data);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        res.json(getDemoData());
    }
});

// Добавить новый товар
app.post('/api/items', async (req, res) => {
    try {
        const { name, image, sizes } = req.body;
        console.log('POST /api/items - Добавление товара:', { name, image, sizes });
        
        if (!name || !image) {
            return res.status(400).json({ 
                error: 'Название и изображение обязательны',
                received: { name, image }
            });
        }
        
        const data = await loadData();
        const newItem = {
            id: generateId(data),
            name: name.trim(),
            image: image.trim(),
            sizes: sizes || { S: 0, M: 0, L: 0, XL: 0, XXL: 0 }
        };
        
        data.push(newItem);
        const saved = await saveData(data);
        
        if (!saved) {
            console.warn('Данные не сохранены на диск, но добавлены в память');
        }
        
        console.log('Товар добавлен, ID:', newItem.id);
        res.status(201).json(newItem);
    } catch (error) {
        console.error('Ошибка добавления товара:', error);
        res.status(500).json({ 
            error: 'Ошибка добавления товара',
            message: error.message
        });
    }
});

// Обновить товар
app.put('/api/items/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { sizes } = req.body;
        console.log(`PUT /api/items/${id} - Обновление размеров:`, sizes);
        
        const data = await loadData();
        const itemIndex = data.findIndex(item => item.id === id);
        
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        data[itemIndex].sizes = sizes;
        const saved = await saveData(data);
        
        if (!saved) {
            console.warn('Данные не сохранены на диск, но обновлены в памяти');
        }
        
        res.json(data[itemIndex]);
    } catch (error) {
        console.error('Ошибка обновления товара:', error);
        res.status(500).json({ 
            error: 'Ошибка обновления данных',
            message: error.message
        });
    }
});

// Удалить товар
app.delete('/api/items/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        console.log(`DELETE /api/items/${id} - Удаление товара`);
        
        const data = await loadData();
        const itemIndex = data.findIndex(item => item.id === id);
        
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        const deletedItem = data.splice(itemIndex, 1)[0];
        const saved = await saveData(data);
        
        if (!saved) {
            console.warn('Данные не сохранены на диск, но удалены из памяти');
        }
        
        res.json({ 
            message: 'Товар удален', 
            item: deletedItem 
        });
    } catch (error) {
        console.error('Ошибка удаления товара:', error);
        res.status(500).json({ 
            error: 'Ошибка удаления товара',
            message: error.message
        });
    }
});

// Проверка здоровья сервера
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Clothing Store API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        publicDir: PUBLIC_DIR
    });
});

// Тестовый маршрут для проверки
app.get('/test', (req, res) => {
    res.json({
        message: 'Сервер работает',
        timestamp: new Date().toISOString(),
        rootDir: __dirname,
        publicDir: PUBLIC_DIR,
        dataFile: DATA_FILE
    });
});

// Маршрут для получения списка файлов
app.get('/files', async (req, res) => {
    try {
        const rootFiles = await fs.readdir(__dirname);
        let publicFiles = [];
        
        try {
            publicFiles = await fs.readdir(PUBLIC_DIR);
        } catch {
            console.log('Папка public не найдена');
        }
        
        res.json({
            rootDirectory: __dirname,
            publicDirectory: PUBLIC_DIR,
            rootFiles: rootFiles,
            publicFiles: publicFiles
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Маршрут не найден',
        path: req.path,
        available: ['/', '/api/items', '/health', '/test', '/files']
    });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// Инициализация данных при старте
async function initializeData() {
    try {
        console.log('Инициализация данных...');
        
        // Создаем папку public если ее нет
        try {
            await fs.access(PUBLIC_DIR);
            console.log(`✓ Папка public найдена: ${PUBLIC_DIR}`);
        } catch {
            console.log(`⚠ Папка public не найдена, создаю: ${PUBLIC_DIR}`);
            await fs.mkdir(PUBLIC_DIR, { recursive: true });
        }
        
        // Загружаем данные
        const data = await loadData();
        console.log(`Загружено ${data.length} товаров`);
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
}

// Старт сервера
app.listen(PORT, async () => {
    console.log('🚀 Сервер запущен!');
    console.log(`📍 Порт: ${PORT}`);
    console.log(`🌐 Ссылка: http://localhost:${PORT}`);
    console.log(`📁 Корневая директория: ${__dirname}`);
    console.log(`📁 Папка public: ${PUBLIC_DIR}`);
    console.log(`📁 Файл данных: ${DATA_FILE}`);
    console.log('📋 Доступные маршруты:');
    console.log('   GET  /              - Главная страница');
    console.log('   GET  /api/items     - Все товары');
    console.log('   POST /api/items     - Добавить товар');
    console.log('   PUT  /api/items/:id - Обновить товар');
    console.log('   DELETE /api/items/:id - Удалить товар');
    console.log('   GET  /health        - Проверка здоровья');
    console.log('   GET  /test          - Тестовый маршрут');
    console.log('   GET  /files         - Список файлов');
    
    // Инициализируем данные
    await initializeData();
});