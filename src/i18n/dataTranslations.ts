import type { LocaleCode } from "./types";
const FARM_DATA_TRANSLATIONS: Record<string, Record<LocaleCode, string>> = {
  // Farm names
  "Apex Swine Breeding Center": {
    en: "Apex Swine Breeding Center",
    hi: "एपेक्स स्वाइन ब्रीडिंग सेंटर",
    kn: "ಏಪೆಕ್ಸ್ ಹಂದಿ ಸಾಕಣೆ ಕೇಂದ್ರ",
    ml: "അപെക്സ് പന്നി പ്രജനന കേന്ദ്രം",
    ta: "அபெக்ஸ் பன்றி இனப்பெருக்க மையம்",
    te: "అపెక్స్ పంది పెంపకం కేంద్రం",
  },
  "Krishna Delta Bio-Poultry": {
    en: "Krishna Delta Bio-Poultry",
    hi: "कृष्णा डेल्टा जैव-पोल्ट्री",
    kn: "ಕೃಷ್ಣಾ ಡೆಲ್ಟಾ ಜೈವಿಕ ಕೋಳಿ ಫಾರ್ಮ್",
    ml: "കൃഷ്ണ ഡെൽറ്റ ബയോ-പൗൾട്രി",
    ta: "கிருஷ்ணா டெல்டா உயிரியல் கோழிப்பண்ணை",
    te: "కృష్ణా డెల్టా బయో-పౌల్ట్రీ",
  },
  "Malabar Bio-Livestock Haven": {
    en: "Malabar Bio-Livestock Haven",
    hi: "मालाबार जैव-पशुधन केंद्र",
    kn: "ಮಲಬಾರ್ ಜೈವಿಕ ಜಾನುವಾರು ಕೇಂದ್ರ",
    ml: "മലബാർ ബയോ-ലൈവ്‌സ്റ്റോക്ക് ഹേവൻ",
    ta: "மலபார் உயிரியல் கால்நடை மையம்",
    te: "మలబార్ బయో-లైవ్‌స్టాక్ హేవెన్",
  },
  "SunRise Poultry Haven": {
    en: "SunRise Poultry Haven",
    hi: "सनराइज पोल्ट्री केंद्र",
    kn: "ಸನ್‌ರೈಸ್ ಕೋಳಿ ಸಾಕಣೆ ಕೇಂದ್ರ",
    ml: "സൺറൈസ് പൗൾട്രി ഹേവൻ",
    ta: "சன்ரைஸ் கோழிப்பண்ணை மையம்",
    te: "సన్‌రైజ్ పౌల్ట్రీ కేంద్రం",
  },
  "Thrissur Pig & Agri Complex": {
    en: "Thrissur Pig & Agri Complex",
    hi: "त्रिशूर सूअर एवं कृषि परिसर",
    kn: "ತ್ರಿಶೂರ್ ಹಂದಿ ಮತ್ತು ಕೃಷಿ ಸಂಕೀರ್ಣ",
    ml: "തൃശ്ശൂർ പന്നി കാർഷിക സമുച്ചയം",
    ta: "திருச்சூர் பன்றி மற்றும் வேளாண் வளாகம்",
    te: "త్రిశూర్ పంది మరియు వ్యవసాయ సముదాయం",
  },
  "Wayanad Highland Poultry Unit": {
    en: "Wayanad Highland Poultry Unit",
    hi: "वायनाड हाइलैंड पोल्ट्री इकाई",
    kn: "ವಯನಾಡು ಹೈಲ್ಯಾಂಡ್ ಕೋಳಿ ಘಟಕ",
    ml: "വയനാട് ഹൈലാൻഡ് പൗൾട്രി യൂണിറ്റ്",
    ta: "வயநாடு ஹைலேண்ட் கோழிப்பண்ணை அலகு",
    te: "వయనాడ్ హైలాండ్ పౌల్ట్రీ యూనిట్",
  },
  "Coastal Godavari Dairy Farm": {
    en: "Coastal Godavari Dairy Farm",
    hi: "कोस्टल गोदावरी डेयरी फार्म",
    kn: "ಕೋಸ್ಟಲ್ ಗೋದಾವರಿ ಡೈರಿ ಫಾರ್ಮ್",
    ml: "കോസ്റ്റൽ ഗോദാവരി ഡയറി ഫാം",
    ta: "கோஸ்டல் கோதாவரி பால் பண்ணை",
    te: "కోస్టల్ గోదావరి డైరీ ఫార్మ్",
  },
  "Deccan Poultry Estate": {
    en: "Deccan Poultry Estate",
    hi: "दक्कन पोल्ट्री एस्टेट",
    kn: "ಡೆಕ್ಕನ್ ಕೋಳಿ ಸಾಕಣೆ ಕೇಂದ್ರ",
    ml: "ഡെക്കാൻ പൗൾട്രി എസ്റ്റേറ്റ്",
    ta: "டெக்கான் கோழிப்பண்ணை நிலையம்",
    te: "డెక్కన్ పౌల్ట్రీ ఎస్టేట్",
  },
  "Rayalaseema Cattle Station": {
    en: "Rayalaseema Cattle Station",
    hi: "रायलसीमा पशु केंद्र",
    kn: "ರಾಯಲಸೀಮಾ ಜಾನುವಾರು ಕೇಂದ್ರ",
    ml: "റായലസീമ കന്നുകാലി കേന്ദ്രം",
    ta: "ராயலசீமா கால்நடை நிலையம்",
    te: "రాయలసీమ పశు కేంద్రం",
  },
  "GreenValley Bio-Farm #04": {
    en: "GreenValley Bio-Farm #04",
    hi: "ग्रीनवैली जैविक फार्म #04",
    kn: "ಗ್ರೀನ್‌ವ್ಯಾಲಿ ಜೈವಿಕ ಫಾರ್ಮ್ #04",
    ml: "ഗ്രീൻവാലി ബയോ-ഫാം #04",
    ta: "கிரீன்வேலி உயிரியல் பண்ணை #04",
    te: "గ్రీన్‌వ్యాలీ బయో-ఫార్మ్ #04",
  },
  "Western Ghats Dairy Cooperative": {
    en: "Western Ghats Dairy Cooperative",
    hi: "पश्चिमी घाट डेयरी सहकारी संस्था",
    kn: "ಪಶ್ಚಿಮ ಘಟ್ಟಗಳ ಡೈರಿ ಸಹಕಾರಿ ಸಂಘ",
    ml: "വെസ്റ്റേൺ ഘട്ട്സ് ഡയറി സഹകരണ സംഘം",
    ta: "மேற்கு தொடர்ச்சி மலைகள் பால் கூட்டுறவு",
    te: "పశ్చిమ కనుమల డైరీ సహకార సంస్థ",
  },
  "Palakkad Green Livestock Farm": {
    en: "Palakkad Green Livestock Farm",
    hi: "पालक्काड ग्रीन पशुधन फार्म",
    kn: "ಪಾಲಕ್ಕಾಡ್ ಗ್ರೀನ್ ಜಾನುವಾರು ಫಾರ್ಮ್",
    ml: "പാലക്കാട് ഗ്രീൻ ലൈവ്‌സ്റ്റോക്ക് ഫാം",
    ta: "பாலக்காடு பசுமை கால்நடை பண்ணை",
    te: "పాలక్కాడ్ గ్రీన్ లైవ్‌స్టాక్ ఫార్మ్",
  },
  "Cauvery Dairy Enterprise": {
    en: "Cauvery Dairy Enterprise",
    hi: "कावेरी डेयरी उद्यम",
    kn: "ಕಾವೇರಿ ಡೈರಿ ಉದ್ಯಮ",
    ml: "കാവേരി ഡയറി സംരംഭം",
    ta: "காவிரி பால் பண்ணை நிறுவனம்",
    te: "కావేరి డైరీ సంస్థ",
  },
  "Kongu Belt Poultry Hub": {
    en: "Kongu Belt Poultry Hub",
    hi: "कोंगु बेल्ट पोल्ट्री केंद्र",
    kn: "ಕೊಂಗು ಬೆಲ್ಟ್ ಕೋಳಿ ಸಾಕಣೆ ಕೇಂದ್ರ",
    ml: "കൊംഗു ബെൽറ്റ് പൗൾട്രി ഹബ്",
    ta: "கொங்கு மண்டல கோழிப்பண்ணை மையம்",
    te: "కొంగు బెల్ట్ పౌల్ట్రీ హబ్",
  },
  "Chota Nagpur Livestock Complex": {
    en: "Chota Nagpur Livestock Complex",
    hi: "छोटा नागपुर पशुधन परिसर",
    kn: "ಛೋಟಾ ನಾಗಪುರ ಜಾನುವಾರು ಸಂಕೀರ್ಣ",
    ml: "ചോട്ടാ നാഗ്പൂർ കന്നുകാലി സമുച്ചയം",
    ta: "சோட்டா நாக்பூர் கால்நடை வளாகம்",
    te: "చోటా నాగ్‌పూర్ పశుసంపద సముదాయం",
  },

  // Owner names
  "Suresh Mahato": {
    en: "Suresh Mahato",
    hi: "सुरेश महतो",
    kn: "ಸುರೇಶ್ ಮಹತೋ",
    ml: "സുരേഷ് മഹതോ",
    ta: "சுரேஷ் மஹதோ",
    te: "సురేష్ మహతో",
  },
  "Suresh Reddy": {
    en: "Suresh Reddy",
    hi: "सुरेश रेड्डी",
    kn: "ಸುರೇಶ್ ರೆಡ್ಡಿ",
    ml: "സുരേഷ് റെഡ്ഡി",
    ta: "சுரேஷ் ரெட்டி",
    te: "సురేష్ రెడ్డి",
  },
  "Anil Kumar": {
    en: "Anil Kumar",
    hi: "अनिल कुमार",
    kn: "ಅನಿಲ್ ಕುಮಾರ್",
    ml: "അനിൽ കുമാർ",
    ta: "அனில் குமார்",
    te: "అనిల్ కుమార్",
  },
  "Anita Devi": {
    en: "Anita Devi",
    hi: "अनीता देवी",
    kn: "ಅನಿತಾ ದೇವಿ",
    ml: "അനിതാ ദേവി",
    ta: "அனிதா தேவி",
    te: "అనితా దేవి",
  },
  "Mohan Kumar": {
    en: "Mohan Kumar",
    hi: "मोहन कुमार",
    kn: "ಮೋಹನ್ ಕುಮಾರ್",
    ml: "മോഹൻ കുമാർ",
    ta: "மோகன் குமார்",
    te: "మోహన్ కుమార్",
  },
  "Gopala Iyer": {
    en: "Gopala Iyer",
    hi: "गोपाल अय्यर",
    kn: "ಗೋಪಾಲ ಅಯ್ಯರ್",
    ml: "ഗോപാല അയ്യർ",
    ta: "கோபால ஐயர்",
    te: "గోపాల అయ్యర్",
  },
  "Mahesha shetty": {
    en: "Mahesha shetty",
    hi: "महेशा शेट्टी",
    kn: "ಮಹೇಶ ಶೆಟ್ಟಿ",
    ml: "മഹേഷ ഷെട്ടി",
    ta: "மகேஷா ஷெட்டி",
    te: "మహేశ శెట్టి",
  },
  "Manjunath Gowda": {
    en: "Manjunath Gowda",
    hi: "मंजुनाथ गौड़ा",
    kn: "ಮಂಜುನಾಥ ಗೌಡ",
    ml: "മഞ്ജുനാഥ ഗൗഡ",
    ta: "மஞ்சுநாத் கவுடா",
    te: "మంజునాథ్ గౌడ",
  },
  "Ravi Reddy": {
    en: "Ravi Reddy",
    hi: "रवि रेड्डी",
    kn: "ರವಿ ರೆಡ್ಡಿ",
    ml: "രവി റെഡ്ഡി",
    ta: "ரவி ரெட்டி",
    te: "రవి రెడ్డి",
  },
  "Rajesh Kumar": {
    en: "Rajesh Kumar",
    hi: "राजेश कुमार",
    kn: "ರಾಜೇಶ್ ಕುಮಾರ್",
    ml: "രാജേഷ് കുമാർ",
    ta: "ராஜேஷ் குமார்",
    te: "రాజేష్ కుమార్",
  },
  "Subbaih chenna": {
    en: "Subbaih chenna",
    hi: "सुब्बैया चेन्ना",
    kn: "ಸುಬ್ಬಯ್ಯ ಚೆನ್ನಾ",
    ml: "സുബ്ബയ്യ ചെന്ന",
    ta: "சுப்பையா சென்னா",
    te: "సుబ్బయ్య చెన్నా",
  },
  "Keshava Kumar": {
    en: "Keshava Kumar",
    hi: "केशव कुमार",
    kn: "ಕೇಶವ ಕುಮಾರ್",
    ml: "കേശവ കുമാർ",
    ta: "கேசவ குமார்",
    te: "కేశవ కుమార్",
  },
  "Mukesh Rao": {
    en: "Mukesh Rao",
    hi: "मुकेश राव",
    kn: "ಮುಕೇಶ್ ರಾವ್",
    ml: "മുകേഷ് റാവു",
    ta: "முகேஷ் ராவ்",
    te: "ముకేశ్ రావు",
  },
  "Murugesha Raman": {
    en: "Murugesha Raman",
    hi: "मुरुगेशा रमन",
    kn: "ಮುರುಗೇಶ ರಾಮನ್",
    ml: "മുരുകേശ രാമൻ",
    ta: "முருகேஷ ராமன்",
    te: "మురుగేశ రామన్",
  },
  "Vikram Singh": {
    en: "Vikram Singh",
    hi: "विक्रम सिंह",
    kn: "ವಿಕ್ರಮ್ ಸಿಂಗ್",
    ml: "വിക്രം സിംഗ്",
    ta: "விக்ரம் சிங்",
    te: "విక్రమ్ సింగ్",
  },
};
const DATA_TRANSLATIONS: Record<LocaleCode, Record<string, string>> = {
  en: {},

  hi: {
    "Jharkhand": "झारखंड",
    "Karnataka": "कर्नाटक",
    "Kerala": "केरल",
    "Tamil Nadu": "तमिलनाडु",
    "Andhra Pradesh": "आंध्र प्रदेश",

    "Ranchi": "रांची",
    "Dhanbad": "धनबाद",
    "East Singhbhum": "पूर्वी सिंहभूम",
    "Hazaribagh": "हजारीबाग",

    "Mysuru": "मैसूरु",
    "Hassan": "हासन",

    "Wayanad": "वायनाड",
    "Thrissur": "त्रिशूर",
    "Palakkad": "पालक्काड",

    "Namakkal": "नमक्कल",
    "Coimbatore": "कोयंबटूर",

    "Chittoor": "चित्तूर",
    "Guntur": "गुंटूर",

    "Khunti": "खुnti",
    "Ramgarh": "रामगढ़",
    "West Godavari": "पश्चिम गोदावरी",

    "Block B, Sector 4, Ranchi District, JH":
      "ब्लॉक B, सेक्टर 4, रांची जिला, JH",
  },

  kn: {
    "Jharkhand": "ಜಾರ್ಖಂಡ್",
    "Karnataka": "ಕರ್ನಾಟಕ",
    "Kerala": "ಕೇರಳ",
    "Tamil Nadu": "ತಮಿಳುನಾಡು",
    "Andhra Pradesh": "ಆಂಧ್ರ ಪ್ರದೇಶ",

    "Ranchi": "ರಾಂಚಿ",
    "Dhanbad": "ಧನಬಾದ್",
    "East Singhbhum": "ಪೂರ್ವ ಸಿಂಗ್‌ಭೂಮ್",
    "Hazaribagh": "ಹಜಾರಿಬಾಗ್",

    "Mysuru": "ಮೈಸೂರು",
    "Hassan": "ಹಾಸನ",

    "Wayanad": "ವಯನಾಡು",
    "Thrissur": "ತ್ರಿಶೂರ್",
    "Palakkad": "ಪಾಲಕ್ಕಾಡ್",

    "Namakkal": "ನಾಮಕ್ಕಲ್",
    "Coimbatore": "ಕೊಯಮತ್ತೂರು",

    "Chittoor": "ಚಿತ್ತೂರು",
    "Guntur": "ಗುಂಟೂರು",

    "Khunti": "ಖುಂಟಿ",
    "Ramgarh": "ರಾಮಗarh",
    "West Godavari": "ಪಶ್ಚಿಮ ಗೋದಾವರಿ",

    "Block B, Sector 4, Ranchi District, JH":
      "ಬ್ಲಾಕ್ B, ಸೆಕ್ಟರ್ 4, ರಾಂಚಿ ಜಿಲ್ಲೆ, JH",
  },

  ml: {
    "Jharkhand": "ജാർഖണ്ഡ്",
    "Karnataka": "കർണാടക",
    "Kerala": "കേരളം",
    "Tamil Nadu": "തമിഴ്നാട്",
    "Andhra Pradesh": "ആന്ധ്രാപ്രദേശ്",

    "Ranchi": "റാഞ്ചി",
    "Dhanbad": "ധൻബാദ്",
    "East Singhbhum": "കിഴക്കൻ സിംഗ്ഭൂം",
    "Hazaribagh": "ഹസാരിബാഗ്",

    "Mysuru": "മൈസൂരു",
    "Hassan": "ഹാസൻ",

    "Wayanad": "വയനാട്",
    "Thrissur": "തൃശ്ശൂർ",
    "Palakkad": "പാലക്കാട്",

    "Namakkal": "നാമക്കൽ",
    "Coimbatore": "കോയമ്പത്തൂർ",

    "Chittoor": "ചിറ്റൂർ",
    "Guntur": "ഗുണ്ടൂർ",

    "Khunti": "ഖunti",
    "Ramgarh": "രാമgarh",
    "West Godavari": "വെസ്റ്റ് ഗോദാവരി",

    "Block B, Sector 4, Ranchi District, JH":
      "ബ്ലോക്ക് B, സെക്ടർ 4, റാഞ്ചി ജില്ല, JH",
  },

  ta: {
    "Jharkhand": "ஜார்கண்ட்",
    "Karnataka": "கர்நாடகா",
    "Kerala": "கேரளா",
    "Tamil Nadu": "தமிழ்நாடு",
    "Andhra Pradesh": "ஆந்திரப் பிரதேசம்",

    "Ranchi": "ராஞ்சி",
    "Dhanbad": "தன்பாத்",
    "East Singhbhum": "கிழக்கு சிங்பூம்",
    "Hazaribagh": "ஹசாரிபாக்",

    "Mysuru": "மைசூரு",
    "Hassan": "ஹாசன்",

    "Wayanad": "வயநாடு",
    "Thrissur": "திருச்சூர்",
    "Palakkad": "பாலக்காடு",

    "Namakkal": "நாமக்கல்",
    "Coimbatore": "கோயம்புத்தூர்",

    "Chittoor": "சித்தூர்",
    "Guntur": "குண்டூர்",

    "Khunti": "கhuntti",
    "Ramgarh": "ராamgarh",
    "West Godavari": "மேற்கு கோதாவரி",

    "Block B, Sector 4, Ranchi District, JH":
      "பிளாக் B, செகtor 4, ராanchi மாவட்டம், JH",
  },

  te: {
    "Jharkhand": "జార్ఖండ్",
    "Karnataka": "కర్ణాటక",
    "Kerala": "కేరళ",
    "Tamil Nadu": "తమిళనాడు",
    "Andhra Pradesh": "ఆంధ్రప్రదేశ్",

    "Ranchi": "రాంచీ",
    "Dhanbad": "ధన్‌బాద్",
    "East Singhbhum": "తూర్పు సింగ్‌భూమ్",
    "Hazaribagh": "హజారీబాగ్",

    "Mysuru": "మైసూరు",
    "Hassan": "హాసన్",

    "Wayanad": "వయనాడ్",
    "Thrissur": "త్రిశూర్",
    "Palakkad": "పాలక్కాడ్",

    "Namakkal": "నామక్కల్",
    "Coimbatore": "కోయంబత్తూరు",

    "Chittoor": "చిత్తూరు",
    "Guntur": "గుంటూరు",

    "Khunti": "ఖunti",
    "Ramgarh": "రామgarh",
    "West Godavari": "పశ్చిమ గోదావరి",

    "Block B, Sector 4, Ranchi District, JH":
      "బ్లాక్ B, సెక్టర్ 4, రాంచీ జిల్లా, JH",
  },
};

export function translateData(
  value: string | null | undefined,
  locale: LocaleCode
): string {
  if (!value) return "";

  const translations = DATA_TRANSLATIONS[locale] ?? {};
  // Translate farm names and owner names
  if (FARM_DATA_TRANSLATIONS[value]?.[locale]) {
    return FARM_DATA_TRANSLATIONS[value][locale];
  }

  // Existing translations
  if (translations[value]) {
    return translations[value];
  }

  // Translate comma-separated location parts.
  // Example:
  // "Mysuru, Karnataka"
  // → "ಮೈಸೂರು, ಕರ್ನಾಟಕ"
  if (value.includes(",")) {
    return value
      .split(",")
      .map((part) => {
        const trimmed = part.trim();

        // Handle "Ranchi District"
        if (trimmed.endsWith(" District")) {
          const districtName = trimmed.replace(/ District$/, "").trim();
          const translatedDistrict =
            translations[districtName] ?? districtName;

          // Add translated "District"
          const districtWord =
            locale === "kn"
              ? "ಜಿಲ್ಲೆ"
              : locale === "hi"
                ? "जिला"
                : locale === "ml"
                  ? "ജില്ല"
                  : locale === "ta"
                    ? "மாவட்டம்"
                    : locale === "te"
                      ? "జిల్లా"
                      : "District";

          return `${translatedDistrict} ${districtWord}`;
        }

        return translations[trimmed] ?? trimmed;
      })
      .join(", ");
  }

  return value;
}