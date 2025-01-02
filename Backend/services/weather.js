
const axios = require("axios");
const apiKey = "d987d16258d01b0c60f0bc433eaa40f2";
const weather = async (req, res) => {
  const city = req.query.city || "dhulikhel";

  const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apiKey}`;

  try {
    const response = await axios.get(weatherUrl);
    const data = response.data;

    // Extract daily forecast
    const dailyForecast = data.list
      .filter((_, index) => index % 8 === 0)
      .slice(0, 7)
      .map((day) => ({
        date: new Date(day.dt * 1000).toLocaleDateString(),
        description: day.weather[0].description,
        temperature: day.main.temp,
        humidity: day.main.humidity,
        wind_speed: day.wind.speed * 3.6, // Convert m/s to km/h
        rainprobability: day.pop,
        main: day.weather[0].main,
      }));

    const currentDate = new Date().toLocaleDateString(); // Today's date
    const hourlyForecast = data.list
      .filter((item) => {
        const itemDate = new Date(item.dt * 1000).toLocaleDateString();
        return itemDate === currentDate;
      })
      .map((hour) => ({
        date: new Date(hour.dt * 1000).toLocaleString(), // Full date and time
        description: hour.weather[0].description,
        temperature: hour.main.temp,
        humidity: hour.main.humidity,
        wind_speed: hour.wind.speed * 3.6, // Convert m/s to km/h
        rainprobability: hour.pop,
        main: hour.weather[0].main,
      }));

    res.json({ forecast: dailyForecast, hourlyForecast: hourlyForecast });
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).json({ error: "Error fetching weather data" });
  }
};

module.exports = weather;
