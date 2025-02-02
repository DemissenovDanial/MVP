new Vue({
    el: '#app',
    data: {
        email: '',
        password: '',
        userName: '',
        transport: '',
        energy: '',
        water: '',
        emission: null,
        treesToPlant: 0,
        file: null,
        isAuthenticated: false,
        date: new Date().toISOString().split('T')[0],
    },
    methods: {
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

        async login() {
            try {
                const response = await axios.post('/login', {
                    email: this.email,
                    password: this.password,
                });
                localStorage.setItem('token', response.data.token);
                this.isAuthenticated = true;
                this.userName = this.email;
                alert('Вы успешно вошли');
            } catch (error) {
                alert('Ошибка при входе');
                console.error(error);
            }
        },

        async register() {
            try {
                const response = await axios.post('/register', {
                    email: this.email,
                    password: this.password,
                });
                alert('Вы успешно зарегистрированы');
            } catch (error) {
                alert('Ошибка при регистрации');
                console.error(error);
            }
        },

        calculateCarbonFootprint() {
            let transportCarbon = this.transport * 0.167;
            let energyCarbon = this.energy * 0.1829;
            let waterCarbon = this.water * 0.92;

            this.emission = transportCarbon + energyCarbon + waterCarbon;
            this.treesToPlant = Math.ceil(this.emission / 22);

            this.sendDataToServer();
        },

        async sendDataToServer() {
            const data = {
                date: this.date,
                transport: this.transport,
                energy: this.energy,
                water: this.water,
                emission: this.emission
            };

            const token = localStorage.getItem('token');
            if (!token) {
                alert('Пожалуйста, войдите в систему');
                return;
            }

            try {
                await axios.post('/data', data, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (error) {
                alert('Ошибка при отправке данных');
                console.error(error);
            }
        },

        handleFileUpload(event) {
            this.file = event.target.files[0];
        },

        async uploadFile() {
            if (!this.file) {
                alert('Пожалуйста, выберите файл');
                return;
            }

            const formData = new FormData();
            formData.append('file', this.file);

            const token = localStorage.getItem('token');
            if (!token) {
                alert('Пожалуйста, войдите в систему');
                return;
            }

            try {
                const response = await axios.post('/upload-carbon-footprint', formData, {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data' 
                    }
                });

                this.transport = response.data.transport || '';
                this.energy = response.data.energy || '';
                this.water = response.data.water || '';

                if (this.transport && this.energy && this.water) {
                    this.calculateCarbonFootprint();
                }
                alert('Данные успешно загружены и расчёт проведён!');
            } catch (error) {
                alert('Ошибка при загрузке данных');
                console.error(error);
            }
        },

        goBackToHome() {
            window.open('/home', '_self')
        }
    },

    created() {
        const token = localStorage.getItem('token');
        if (token) {
            this.isAuthenticated = true;
            this.userName = localStorage.getItem('userName') || '';
            console.log(this.userName);
            
        } else {
            this.isAuthenticated = false;
            window.open('/', '_self')
        }
    }
});