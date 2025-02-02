new Vue({
    el: '#app',
    data: {
        entries: [],
        date: '',
        emission: '',
        file: null,
        fileCarbon: null,
        isAuthenticated: false,
        chart: null
    },
    mounted() {
        this.fetchData();
        this.checkAuthentication();
    },
    methods: {
        checkAuthentication() {
            const token = localStorage.getItem('token');
            if (token) {
                this.isAuthenticated = true;
                this.userName = localStorage.getItem('userName') || '';
            } else {
                this.isAuthenticated = false;
                window.open('/', '_self')
            }
        },
        logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('userName');
            this.isAuthenticated = false;
            this.userName = '';
            alert('Вы вышли из системы');
            window.open('/', '_self')
        },
        async fetchData() {
            const token = localStorage.getItem('token');
            if (!token) return;
            const response = await axios.get('/data', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            this.entries = response.data;
            this.updateChart();
        },

        async addEntry() {
            if (!this.date || !this.emission) return;
            const formattedDate = new Date(this.date).toLocaleDateString('ru-RU');
            const token = localStorage.getItem('token');
            await axios.post('/data', 
                { date: formattedDate, emission: parseFloat(this.emission) }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            this.date = '';
            this.emission = '';
            this.fetchData();
        },

        handleFileUpload(event) {
            this.file = event.target.files[0];
        },

        async uploadData() {
            if (!this.file) {
                alert('Пожалуйста, выберите файл');
                return;
            }

            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', this.file);

            try {
                await axios.post('/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`
                    }
                });
                alert('Данные выбросов успешно загружены');
                this.fetchData();
            } catch (error) {
                alert('Ошибка при загрузке данных выбросов');
                console.error(error);
            }
        },
        
        handleCarbonFileUpload(event) {
            this.fileCarbon = event.target.files[0];
        },

        async uploadCarbonData() {
            if (!this.fileCarbon) {
                alert('Пожалуйста, выберите файл для углеродного следа');
                return;
            }

            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', this.fileCarbon);

            try {
                await axios.post('/upload-carbon-footprint', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`
                    }
                });
                alert('Данные углеродного следа успешно загружены');
            } catch (error) {
                alert('Ошибка при загрузке данных углеродного следа');
                console.error(error);
            }
        },

        updateChart() {
            if (this.chart) this.chart.destroy();
        
            const sortedEntries = this.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        
            const ctx = document.getElementById('emissionsChart').getContext('2d');
            
            const labels = sortedEntries.map(entry => {
                const date = new Date(entry.date);
                return date.toLocaleDateString('ru-RU');
            });
            
            const data = sortedEntries.map(entry => entry.emission);

            this.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Выбросы CO₂ (кг)',
                        data: data,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderWidth: 2,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            title: { display: true, text: 'Дата' },
                            type: 'category',
                        },
                        y: {
                            title: { display: true, text: 'Выбросы CO₂ (кг)' },
                            beginAtZero: true
                        }
                    }
                }
            });
        },

        goToCarbonCalculation() {
            window.open('/carbon', '_self')
        },
    }
    }
);
