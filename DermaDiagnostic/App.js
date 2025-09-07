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
  TextInput,
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
  const [selectedImages, setSelectedImages] = useState([]);
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    zona: '',
    antecedentes: '',
    sintomas: '',
    tiempo: '',
    factores: '',
  });
  const [formVisible, setFormVisible] = useState(false);

  // Seleccionar entre 3 y 5 imágenes
  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 0.8,
      });
      if (!result.canceled) {
        const images = result.assets.map(asset => asset.uri);
        if (images.length < 3 || images.length > 5) {
          Alert.alert('Selecciona entre 3 y 5 fotos.');
          return;
        }
        setSelectedImages(images);
        setFormVisible(true);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar las imágenes: ' + error.message);
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

  // Analizar imágenes con Gemini y datos adicionales
  const analyzeImages = async () => {
    if (selectedImages.length < 3) {
      Alert.alert('Error', 'Por favor selecciona entre 3 y 5 imágenes primero');
      return;
    }
    if (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === 'TU_API_KEY_DE_GEMINI_AQUI') {
      Alert.alert('Error', 'Por favor configura tu API key de Gemini en config.js');
      return;
    }
    setLoading(true);
    try {
      const base64Images = [];
      for (const uri of selectedImages) {
        base64Images.push(await imageToBase64(uri));
      }
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Analiza las siguientes imágenes de piel y proporciona un diagnóstico dermatológico.
      
      Datos adicionales del paciente:
      - Zona del cuerpo afectada: ${form.zona}
      - Antecedentes médicos relevantes: ${form.antecedentes}
      - Síntomas asociados: ${form.sintomas}
      - Tiempo de evolución: ${form.tiempo}
      - Factores externos: ${form.factores}
      
      Instrucciones específicas:
      1. Examina cuidadosamente las imágenes en busca de lesiones, erupciones, cambios de color, textura o cualquier anomalía visible
      2. Identifica la condición dermatológica más probable basándose en las características visuales y los datos proporcionados
      3. Responde ÚNICAMENTE con el nombre de la condición en español, en minúsculas
      4. Si detectas múltiples condiciones, menciona la más prominente
      5. Condiciones comunes a considerar: acné, dermatitis, psoriasis, eczema, herpes zoster, melanoma, rosácea, vitiligo
      6. Si no puedes identificar claramente una condición, responde "condición no identificada"
      
      Importante: Tu respuesta debe ser solo el nombre de la condición dermatológica, sin explicaciones adicionales.`;
      const geminiInputs = [prompt];
      base64Images.forEach(img => {
        geminiInputs.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: img
          }
        });
      });
      const result = await model.generateContent(geminiInputs);
      const response = await result.response;
      const diagnosisText = response.text().toLowerCase().trim();
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
      Alert.alert('Error', 'No se pudo analizar las imágenes. Verifica tu conexión y API key.');
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    setSelectedImages([]);
    setDiagnosis(null);
    setForm({
      zona: '',
      antecedentes: '',
      sintomas: '',
      tiempo: '',
      factores: '',
    });
    setFormVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>DermaDiagnostic</Text>
        <Text style={styles.subtitle}>Diagnóstico dermatológico con IA</Text>
        <Text style={{color: 'red', fontWeight: 'bold', marginBottom: 10}}>
          Este análisis es orientativo, no reemplaza la consulta médica
        </Text>
        {!selectedImages.length ? (
          <View style={styles.imagePickerContainer}>
            <Text style={styles.instructionText}>
              Selecciona entre 3 y 5 fotos de la lesión cutánea desde diferentes ángulos, distancias y condiciones de luz
            </Text>
            <TouchableOpacity style={styles.button} onPress={pickImages}>
              <Text style={styles.buttonText}>🖼️ Seleccionar Fotos</Text>
            </TouchableOpacity>
          </View>
        ) : formVisible ? (
          <View style={styles.imageContainer}>
            <Text style={{fontWeight: 'bold', marginBottom: 8}}>
              {selectedImages.length} fotos seleccionadas
            </Text>
            <ScrollView horizontal>
              {selectedImages.map((img, idx) => (
                <Image key={idx} source={{ uri: img }} style={{ width: 100, height: 100, marginRight: 8, borderRadius: 8 }} />
              ))}
            </ScrollView>
            <View style={{marginTop: 16}}>
              <Text style={{fontWeight: 'bold', marginBottom: 8}}> Completa la información para enriquecer el análisis:</Text>
              <View style={{marginBottom: 8}}>
                <Text style={{marginBottom: 4}}> Zona del cuerpo afectada:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ejemplo: brazo, cuero cabelludo, espalda"
                  value={form.zona}
                  onChangeText={text => setForm(f => ({...f, zona: text}))}
                />
              </View>
              <View style={{marginBottom: 8}}>
                <Text style={{marginBottom: 4}}> Antecedentes médicos relevantes:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ejemplo: alergias, enfermedades previas"
                  value={form.antecedentes}
                  onChangeText={text => setForm(f => ({...f, antecedentes: text}))}
                />
              </View>
              <View style={{marginBottom: 8}}>
                <Text style={{marginBottom: 4}}> Síntomas asociados:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ejemplo: picazón, dolor, secreción, fiebre"
                  value={form.sintomas}
                  onChangeText={text => setForm(f => ({...f, sintomas: text}))}
                />
              </View>
              <View style={{marginBottom: 8}}>
                <Text style={{marginBottom: 4}}> Tiempo de evolución:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ejemplo: días, semanas, meses"
                  value={form.tiempo}
                  onChangeText={text => setForm(f => ({...f, tiempo: text}))}
                />
              </View>
              <View style={{marginBottom: 8}}>
                <Text style={{marginBottom: 4}}>Factores externos:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ejemplo: contacto con animales, exposición solar, uso de químicos"
                  value={form.factores}
                  onChangeText={text => setForm(f => ({...f, factores: text}))}
                />
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.button, loading && styles.disabledButton]} 
                  onPress={analyzeImages}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>🔍 Analizar</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={resetApp}>
                  <Text style={styles.buttonText}>🔄 Nueva Consulta</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null
        }
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
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
    backgroundColor: '#fff',
  },
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