const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Solo permitir GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Obtener los parámetros de la query string
    const { term, media = 'music', limit = '50', country = 'US' } = event.queryStringParameters || {};

    if (!term) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing term parameter' })
      };
    }

    // Construir la URL de iTunes API
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=${media}&limit=${limit}&country=${country}`;

    // Hacer la petición a iTunes
    const response = await fetch(itunesUrl);
    const data = await response.json();

    // Filtrar solo música electrónica
    const electronicGenres = [
      'electronic',
      'dance',
      'trance',
      'house',
      'techno',
      'ambient',
      'progressive house',
      'deep house',
      'progressive trance'
    ];

    const filteredResults = data.results.filter(track => {
      const genre = (track.primaryGenreName || '').toLowerCase();
      return electronicGenres.some(eGenre => genre.includes(eGenre));
    });

    // Devolver los resultados filtrados
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resultCount: filteredResults.length,
        results: filteredResults
      })
    };

  } catch (error) {
    console.error('Error fetching from iTunes:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to fetch data from iTunes API' })
    };
  }
};
