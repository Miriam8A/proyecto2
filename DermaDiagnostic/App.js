import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config';

// Configuración de la API de Gemini
const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

// Base de datos de recomendaciones
const diseaseRecommendations = {
  'acné': {
    description: 'Condición común de la piel caracterizada por poros obstruidos',
    medications: ['Peróxido de benzoilo', 'Ácido salicílico', 'Tretinoína'],
    advice: 'Mantén la piel limpia, evita tocar las lesiones y usa productos no comedogénicos'
  },
  'herpes zoster': {
    description: 'Infección viral que causa una erupción dolorosa',
    medications: ['Aciclovir', 'Valaciclovir', 'Famciclovir'],
    advice: 'Consulta inmediatamente con un médico. El tratamiento temprano es crucial.'
  },
  'dermatitis': {
    description: 'Inflamación de la piel que puede ser alérgica o de contacto',
    medications: ['Cremas con corticosteroides', 'Antihistamínicos', 'Emolientes'],
    advice: 'Identifica y evita los desencadenantes, mantén la piel hidratada'
  },
  'psoriasis': {
    description: 'Enfermedad autoinmune que acelera el ciclo de vida de las células de la piel',
    medications: ['Corticosteroides tópicos', 'Análogos de vitamina D', 'Metotrexato'],
    advice: 'Evita el estrés, mantén la piel hidratada y considera tratamientos con luz UV'
  },
  'melanoma': {
    description: 'Tipo de cáncer de piel que se desarrolla en los melanocitos',
    medications: ['Requiere evaluación médica inmediata'],
    advice: '¡URGENTE! Consulta inmediatamente con un dermatólogo oncólogo'
  },
  'eczema': {
    description: 'Condición que hace que la piel se inflame, pique y se enrojezca',
    medications: ['Cremas con corticosteroides', 'Inhibidores de calcineurina', 'Emolientes'],
    advice: 'Evita irritantes, usa jabones suaves y mantén la piel bien hidratada'
  }
};

export default function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);

  // Tomar foto con la cámara
  const takePhoto = async () => {
    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara para tomar fotos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto: ' + error.message);
    }
  };

  // Seleccionar imagen de la galería
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen: ' + error.message);
    }
  };

  // Convertir imagen a base64
  const imageToBase64 = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error('Error al convertir imagen');
    }
  };

  // Analizar imagen con Gemini
  const analyzeImage = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Por favor selecciona una imagen primero');
      return;
    }

    if (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === 'TU_API_KEY_DE_GEMINI_AQUI') {
      Alert.alert('Error', 'Por favor configura tu API key de Gemini en config.js');
      return;
    }

    setLoading(true);
    try {
      const base64Image = await imageToBase64(selectedImage);
      
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Analiza esta imagen de piel y proporciona un diagnóstico dermatológico.
      
      Instrucciones específicas:
      1. Examina cuidadosamente la imagen en busca de lesiones, erupciones, cambios de color, textura o cualquier anomalía visible
      2. Identifica la condición dermatológica más probable basándose en las características visuales
      3. Responde ÚNICAMENTE con el nombre de la condición en español, en minúsculas
      4. Si detectas múltiples condiciones, menciona la más prominente
      5. Condiciones comunes a considerar: acné, dermatitis, psoriasis, eczema, herpes zoster, melanoma, rosácea, vitiligo
      6. Si no puedes identificar claramente una condición, responde "condición no identificada"
      
      Importante: Tu respuesta debe ser solo el nombre de la condición dermatológica, sin explicaciones adicionales.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image
          }
        }
      ]);

      const response = await result.response;
      const diagnosisText = response.text().toLowerCase().trim();
      
      // Buscar recomendaciones
      const recommendation = diseaseRecommendations[diagnosisText] || {
        description: 'Condición no identificada en nuestra base de datos',
        medications: ['Consulta con un dermatólogo'],
        advice: 'Se recomienda evaluación médica profesional para un diagnóstico preciso'
      };

      setDiagnosis({
        condition: diagnosisText,
        ...recommendation
      });

    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo analizar la imagen. Verifica tu conexión y API key.');
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    setSelectedImage(null);
    setDiagnosis(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>DermaDiagnostic</Text>
        <Text style={styles.subtitle}>Diagnóstico dermatológico con IA</Text>

        {!selectedImage ? (
          <View style={styles.imagePickerContainer}>
            <Text style={styles.instructionText}>
              Toma una foto o selecciona una imagen de la lesión cutánea para analizar
            </Text>
            
            <TouchableOpacity style={styles.button} onPress={takePhoto}>
              <Text style={styles.buttonText}>📷 Tomar Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={pickImage}>
              <Text style={styles.buttonText}>🖼️ Seleccionar de Galería</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, loading && styles.disabledButton]} 
                onPress={analyzeImage}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>🔍 Analizar Imagen</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={resetApp}>
                <Text style={styles.buttonText}>🔄 Nueva Imagen</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {diagnosis && (
          <View style={styles.diagnosisContainer}>
            <Text style={styles.diagnosisTitle}>Diagnóstico</Text>
            <Text style={styles.conditionText}>{diagnosis.condition.toUpperCase()}</Text>
            
            <Text style={styles.sectionTitle}>Descripción:</Text>
            <Text style={styles.descriptionText}>{diagnosis.description}</Text>

            <Text style={styles.sectionTitle}>Tratamientos recomendados:</Text>
            {diagnosis.medications.map((med, index) => (
              <Text key={index} style={styles.medicationText}>• {med}</Text>
            ))}

            <Text style={styles.sectionTitle}>Consejos:</Text>
            <Text style={styles.adviceText}>{diagnosis.advice}</Text>

            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                ⚠️ IMPORTANTE: Este diagnóstico es orientativo. Siempre consulta con un dermatólogo profesional para un diagnóstico definitivo y tratamiento adecuado.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#7f8c8d',
    marginBottom: 30,
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  instructionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#34495e',
    marginBottom: 30,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#95a5a6',
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedImage: {
    width: 300,
    height: 300,
    borderRadius: 15,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  diagnosisContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  diagnosisTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 15,
  },
  conditionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#fdf2f2',
    padding: 10,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 15,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: '#34495e',
    lineHeight: 22,
    marginBottom: 10,
  },
  medicationText: {
    fontSize: 16,
    color: '#27ae60',
    marginVertical: 2,
    fontWeight: '500',
  },
  adviceText: {
    fontSize: 16,
    color: '#34495e',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  disclaimer: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  disclaimerText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '500',
  },
});