import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera, Upload } from 'lucide-react-native';
import { useI18n } from '../hooks/useI18n';

interface ImagePickerComponentProps {
  onImageSelected: (base64: string, extension: string) => void;
  selectedImage?: string;
}

const ImagePickerComponent: React.FC<ImagePickerComponentProps> = ({
  onImageSelected,
  selectedImage,
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {

    setLoading(true);
    
    try {
      // Request permissions for non-web platforms
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert('إذن مطلوب', 'نحتاج إذن للوصول إلى مكتبة الصور');
          setLoading(false);
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Always process the image to ensure consistency
        await processImage(asset.uri, asset.base64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('خطأ', 'حدث خطأ في اختيار الصورة');
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {

    setLoading(true);
    
    try {
      // Request permissions for non-web platforms
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert('إذن مطلوب', 'نحتاج إذن للوصول إلى الكاميرا');
          setLoading(false);
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Always process the image to ensure consistency
        await processImage(asset.uri, asset.base64);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('خطأ', 'حدث خطأ في التقاط الصورة');
    } finally {
      setLoading(false);
    }
  };

  const processImage = async (uri: string, existingBase64?: string) => {
    try {
      // If we already have base64, use it directly
      if (existingBase64) {
        onImageSelected(existingBase64, 'jpg');
        return;
      }

      // Resize image to reduce file size
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (manipulatedImage.base64) {
        onImageSelected(manipulatedImage.base64, 'jpg');
      } else {
        throw new Error('فشل في معالجة الصورة');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('خطأ', 'حدث خطأ في معالجة الصورة');
    }
  };

  const showActionSheet = () => {
    if (Platform.OS === 'web') {
      // On web, only show gallery option
      pickImage();
    } else {
      Alert.alert(
        'اختر صورة',
        'كيف تريد إضافة صورة الإيصال؟',
        [
          { text: 'الكاميرا', onPress: takePhoto },
          { text: 'مكتبة الصور', onPress: pickImage },
          { text: 'إلغاء', style: 'cancel' },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('payment.receipt_image')}</Text>
      
      {selectedImage ? (
        <TouchableOpacity style={styles.imageContainer} onPress={showActionSheet}>
          <Image 
            source={{ uri: `data:image/jpeg;base64,${selectedImage}` }}
            style={styles.selectedImage}
            resizeMode="cover"
          />
          <View style={styles.changeOverlay}>
            <Text style={styles.changeText}>تغيير</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={showActionSheet}
          disabled={loading}
        >
          <Upload size={32} color="#6B7280" />
          <Text style={styles.uploadText}>
            {loading ? 'جاري التحميل...' : t('payment.upload_receipt')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'right',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: 200,
  },
  changeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    alignItems: 'center',
  },
  changeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ImagePickerComponent;