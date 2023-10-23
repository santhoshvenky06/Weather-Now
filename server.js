const express = require('express');
const path = require('path');
const cors = require('cors');
const say = require('say');


const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const apiKey = 'b6b0cd8e9f1bae071235cacf86dda4ad';




app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.post('/speak', (req, res) => {
    let text = req.body.text;
    say.speak(text, 'Alex', 1.0, (err) => {
        if (err) {
            return res.json({ message: err, error: true });
        }
        return res.json({ message: 'Text spoken.', error: false });
    });
});


app.get('/CurrentWeather/:location', async (req, res) => {
    const location = req.params.location;
    // console.log(location);
    const apiURL = 'https://api.openweathermap.org/data/2.5/weather?q=' + location + '&appid=b6b0cd8e9f1bae071235cacf86dda4ad&units=metric';
    try {
        const response = await fetch(apiURL);
        const weatherData = await response.json();
        // console.log(weatherData)
        if (weatherData.sys && weatherData.sys.country) {
            const responseData =
            {
                temperature: weatherData.main.temp.toFixed(),
                feelsLike: weatherData.main.feels_like.toFixed(),
                weatherDescription: weatherData.weather[0].description,
            };

            res.json(responseData);
        }
        else {
            console.error('not valid destination');
        }
    }
    catch (error) {
        console.error('error fetching current data', error);
    }
});

app.get('/AirPollution/:lon/:lat', async (req, res) => {
    const lon = req.params.lon;
    const lat = req.params.lat;
    const airPollutionURL = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;

    try {
        const response = await fetch(airPollutionURL);
        const airPollutionData = await response.json();

        if (airPollutionData.list && airPollutionData.list.length > 0) {
            const pm25 = airPollutionData.list[0].components.pm2_5;

            let maskRecommendation = '';
            if (pm25 > 10) {
                maskRecommendation = 'Air quality is poor. It is recommended to wear a mask.';
            }
            const responseData = {
                pm25,
                maskRecommendation,
            };

            res.json(responseData);
        } else {
            console.error('No air pollution data available.');
        }
    } catch (error) {
        console.error('Error fetching air pollution data:', error);
    }
});



app.get('/ForecastWeather/:location', async (req, res) => {
    const location = req.params.location;
    const forecastURL = 'https://api.openweathermap.org/data/2.5/forecast?q=' + location + '&appid=b6b0cd8e9f1bae071235cacf86dda4ad&units=metric';

    try {
        const response = await fetch(forecastURL);
        const forecastData = await response.json();
        var isRain = false;
        if (forecastData.list && forecastData.list.length > 0) {
            console.log(forecastData)
            const lon = forecastData.city.coord.lon
            const lat = forecastData.city.coord.lat
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 5);

            const filteredData = forecastData.list.filter(item => {
                const timestamp = new Date(item.dt * 1000);
                return timestamp >= startDate && timestamp < endDate;
            });

            if (filteredData.length > 0) {
                const dailyAverages = {};
                filteredData.forEach(item => {
                    const date = (item.dt_txt).split(" ")[0];

                    if (!dailyAverages[date]) {
                        dailyAverages[date] = {
                            temperature: 0,
                            wind: 0,
                            feelsLike: 0,
                            rainFall: 0,
                            perDay: 0,
                        };
                    }

                    dailyAverages[date].temperature += item.main.temp;
                    dailyAverages[date].wind += item.wind.speed;
                    dailyAverages[date].feelsLike += item.main.feels_like;
                    dailyAverages[date].perDay++;
                    if (item.weather[0].main == "Rain") {
                        dailyAverages[date].rainFall += (item.rain && item.rain['3h']) || 0;
                        isRain = true;
                    }
                });

                for (const date in dailyAverages) {
                    const dailyAverage = dailyAverages[date];
                    dailyAverage.temperature = (dailyAverage.temperature / dailyAverage.perDay).toFixed();
                    dailyAverage.wind = (dailyAverage.wind / dailyAverage.perDay).toFixed(2);
                    dailyAverage.feelsLike = (dailyAverage.feelsLike / dailyAverage.perDay).toFixed();
                    dailyAverage.rainFall = (dailyAverage.rainFall / dailyAverage.perDay).toFixed(2);

                }
                dailyAverages['lon'] = lon
                dailyAverages['lat'] = lat
                dailyAverages['isRain'] = isRain
                res.json(dailyAverages);

            } else {
                console.error('No data available for the next 5 days.');
            }
        } else {
            console.error('Location not found.');
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
});

app.get('/PackingGuide/:location', async (req, res) => {
    const location = req.params.location;
    const packingURL = 'https://api.openweathermap.org/data/2.5/forecast?q=' + location + '&appid=b6b0cd8e9f1bae071235cacf86dda4ad&units=metric';

    try {
        const response = await fetch(packingURL);
        const packingData = await response.json();
        if (packingData.list && packingData.list.length > 0) {
            const totalTemperature = packingData.list.reduce((sum, item) => sum + item.main.temp, 0);
            const avgTemp = totalTemperature / packingData.list.length;

            let packingGuide = '';

            if (avgTemp < 13) {
                packingGuide = 'It is going to be cold, highly recommend packing some warm clothes!';
            } else if (avgTemp >= 13 && avgTemp <= 23) {
                packingGuide = 'It is going to be pleasant, you will have a great time in comfortable clothes!';
            } else {
                packingGuide = 'It is going to be warm, get your shorts and shades out!';
            }

            res.json({ packingGuide });
        } else {
            console.error('Not valid location');
        }
    } catch (error) {
        console.error('Error getting packing data', error);
    }
});

+



app.listen(3000, () => {
    console.log(`Server is up and running 3000`);
});