// Configuración de la aplicación
export const config = {
  // Reemplaza con tu API key de Google Gemini
  // Puedes obtenerla en: https://makersuite.google.com/app/apikey
  GEMINI_API_KEY: 'AIzaSyDoPaefKgFJdDp2fg5BPlDAstXL91m91Do',
  
  // Configuración de la aplicación
  APP_NAME: 'DermaDiagnostic',
  VERSION: '1.0.0',
  
  // Configuraciones de imagen
  IMAGE_QUALITY: 0.8,
  MAX_IMAGE_SIZE: 1024,
  
  // Configuraciones de análisis
  DEFAULT_MODEL: 'gemini-1.5-flash',
  ANALYSIS_TIMEOUT: 30000, // 30 segundos
};

// Instrucciones para configurar la API key:
// 1. Ve a https://makersuite.google.com/app/apikey
// 2. Crea una nueva API key
// 3. Copia la API key y pégala arriba reemplazando 'TU_API_KEY_DE_GEMINI_AQUI'
// 4. Asegúrate de mantener las comillas
