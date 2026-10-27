import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { palette } from '@/shared/ui/theme';

interface HomeWelcomeProps { canEdit: boolean; onCreate?: () => void }

export function HomeWelcome({ canEdit, onCreate }: HomeWelcomeProps) {
  return <View style={welcomeStyles.panel}>
    <View style={welcomeStyles.copy}>
      <Text style={welcomeStyles.eyebrow}>A LITTLE MORE ORDER</Text>
      <Text style={welcomeStyles.title}>家里的美好，从归位开始。</Text>
      <Text style={welcomeStyles.description}>记录你拥有的，找到你需要的。</Text>
      {canEdit ? <Pressable accessibilityRole="button" onPress={onCreate ?? (() => router.push('/item/form'))} style={welcomeStyles.button}><Ionicons name="add" size={17} color="#fff" /><Text style={welcomeStyles.buttonText}>记录一件物品</Text></Pressable> : null}
    </View>
    <Image accessible={false} source={require('../../../../../packages/ui/src/assets/category-presets/location-apartment.png')} resizeMode="contain" style={welcomeStyles.artwork} />
  </View>;
}

const welcomeStyles=StyleSheet.create({
  panel:{position:'relative',minHeight:180,borderRadius:20,backgroundColor:palette.canvasStrong,padding:20,overflow:'hidden',justifyContent:'center'},
  copy:{maxWidth:'65%',gap:8,zIndex:1},
  eyebrow:{fontSize:9,letterSpacing:1.2,color:palette.brandStrong,fontWeight:'600'},
  title:{fontSize:18,lineHeight:28,fontWeight:'600',color:palette.text},
  description:{fontSize:11,lineHeight:18,color:palette.textMuted},
  button:{alignSelf:'flex-start',minHeight:44,borderRadius:12,paddingHorizontal:12,backgroundColor:palette.brandStrong,flexDirection:'row',alignItems:'center',gap:6,marginTop:4},
  buttonText:{fontSize:12,color:'#fff',fontWeight:'600'},
  artwork:{position:'absolute',width:115,height:115,right:0,top:20},
});
