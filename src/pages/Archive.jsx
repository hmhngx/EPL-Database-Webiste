import { useState, useMemo, useEffect, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaFilter, FaBook, FaChartBar, FaCalendarAlt, FaUser, FaTag, FaCog, FaTimes, FaDownload, FaFilePdf, FaFileAlt, FaSpinner, FaCheck, FaRobot, FaCode, FaEdit, FaMapMarkerAlt, FaMap, FaCommentDots, FaPaperPlane, FaCheckCircle, FaShieldAlt, FaExclamationTriangle, FaClipboardCheck, FaHistory } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import axios from 'axios';
import NeonTooltip from '../components/NeonTooltip';

// Mock Corpus Data - Historical Transcripts
const archiveData = [
  {
    id: 1,
    date: "2023-08-12",
    speaker: "Pep Guardiola",
    tags: ["Tactics", "Post-Match", "Possession"],
    content: "We controlled the game. The possession was good, but the transition defense needs work. VAR decisions today were controversial, but we must focus on what we can control. The title race is long, and every point matters.",
    content_es: "Controlamos el juego. La posesión fue buena, pero la defensa en transición necesita trabajo. Las decisiones del VAR hoy fueron controvertidas, pero debemos centrarnos en lo que podemos controlar. La carrera por el título es larga, y cada punto importa. En el Etihad Stadium, nuestra filosofía de juego se mantiene constante desde mis días en Barcelona.",
    content_en: "We controlled the game. The possession was good, but the transition defense needs work. VAR decisions today were controversial, but we must focus on what we can control. The title race is long, and every point matters. At the Etihad Stadium, our playing philosophy remains constant from my days in Barcelona.",
    locations: ["Etihad Stadium", "Manchester", "Barcelona"]
  },
  {
    id: 2,
    date: "2023-08-19",
    speaker: "Jurgen Klopp",
    tags: ["Injury", "Tactics", "Post-Match"],
    content: "The injury to our key player changes everything. We need to adapt our tactics quickly. Possession without purpose means nothing. The VAR review took too long, and it affected the flow of the game.",
    content_es: "La lesión de nuestro jugador clave cambia todo. Necesitamos adaptar nuestras tácticas rápidamente. La posesión sin propósito no significa nada. La revisión del VAR tomó demasiado tiempo y afectó el ritmo del juego. En Anfield, la energía de los aficionados nos impulsa, pero hoy enfrentamos desafíos tácticos importantes.",
    content_en: "The injury to our key player changes everything. We need to adapt our tactics quickly. Possession without purpose means nothing. The VAR review took too long, and it affected the flow of the game. At Anfield, the energy from the fans drives us, but today we faced significant tactical challenges.",
    locations: ["Anfield", "Liverpool"]
  },
  {
    id: 3,
    date: "2023-08-26",
    speaker: "Mikel Arteta",
    tags: ["VAR", "Controversy", "Post-Match"],
    content: "VAR has become a talking point again. The decision was clear to me, but the officials saw it differently. We need consistency. Our title ambitions remain strong despite this setback.",
    content_es: "El VAR se ha convertido en un tema de conversación nuevamente. La decisión fue clara para mí, pero los oficiales la vieron de manera diferente. Necesitamos consistencia. Nuestras ambiciones de título siguen siendo fuertes a pesar de este revés. En el Emirates Stadium, la presión de los aficionados fue increíble.",
    content_en: "VAR has become a talking point again. The decision was clear to me, but the officials saw it differently. We need consistency. Our title ambitions remain strong despite this setback. At the Emirates Stadium, the pressure from the fans was incredible.",
    locations: ["Emirates Stadium", "London"]
  },
  {
    id: 4,
    date: "2023-09-02",
    speaker: "Erik ten Hag",
    tags: ["Tactics", "Possession", "Post-Match"],
    content: "Our possession stats were excellent, but we lacked cutting edge. The transition from defense to attack must improve. Injury concerns are mounting, and we need to manage the squad carefully.",
    content_es: "Nuestras estadísticas de posesión fueron excelentes, pero nos faltó filo. La transición de la defensa al ataque debe mejorar. Las preocupaciones por lesiones están aumentando y necesitamos gestionar el equipo con cuidado. En Old Trafford, la presión es siempre alta, y debemos mantener nuestros estándares.",
    content_en: "Our possession stats were excellent, but we lacked cutting edge. The transition from defense to attack must improve. Injury concerns are mounting, and we need to manage the squad carefully. At Old Trafford, the pressure is always high, and we must maintain our standards.",
    locations: ["Old Trafford", "Manchester"]
  },
  {
    id: 5,
    date: "2023-09-09",
    speaker: "Ange Postecoglou",
    tags: ["Tactics", "Post-Match"],
    content: "The philosophy is clear: high possession, quick transitions, and aggressive pressing. VAR decisions will always be debated, but we focus on our performance. The title is the ultimate goal.",
    content_es: "La filosofía es clara: alta posesión, transiciones rápidas y presión agresiva. Las decisiones del VAR siempre serán debatidas, pero nos centramos en nuestro rendimiento. El título es el objetivo final. En el Tottenham Hotspur Stadium, estamos construyendo algo especial con nuestro estilo de juego.",
    content_en: "The philosophy is clear: high possession, quick transitions, and aggressive pressing. VAR decisions will always be debated, but we focus on our performance. The title is the ultimate goal. At the Tottenham Hotspur Stadium, we are building something special with our playing style.",
    locations: ["Tottenham Hotspur Stadium", "London"]
  },
  {
    id: 6,
    date: "2023-09-16",
    speaker: "Eddie Howe",
    tags: ["Injury", "Post-Match", "Tactics"],
    content: "Injuries have disrupted our rhythm. We need to find solutions quickly. Our possession game has suffered, and the transition defense has been exposed. VAR calls went against us today.",
    content_es: "Las lesiones han interrumpido nuestro ritmo. Necesitamos encontrar soluciones rápidamente. Nuestro juego de posesión ha sufrido y la defensa en transición ha sido expuesta. Las llamadas del VAR fueron en nuestra contra hoy. En St. James' Park, los aficionados merecen más, y trabajaremos para dárselo.",
    content_en: "Injuries have disrupted our rhythm. We need to find solutions quickly. Our possession game has suffered, and the transition defense has been exposed. VAR calls went against us today. At St. James' Park, the fans deserve more, and we will work to give it to them.",
    locations: ["St. James' Park", "Newcastle"]
  },
  {
    id: 7,
    date: "2023-09-23",
    speaker: "Unai Emery",
    tags: ["VAR", "Tactics", "Controversy"],
    content: "The VAR review process needs improvement. Too many delays, too much controversy. Our tactical approach worked well, but possession alone doesn't win games. We need more clinical finishing.",
    content_es: "El proceso de revisión del VAR necesita mejoras. Demasiados retrasos, demasiada controversia. Nuestro enfoque táctico funcionó bien, pero la posesión sola no gana partidos. Necesitamos más definición clínica. En Villa Park, recordé mi tiempo en Sevilla, donde desarrollamos un estilo de juego similar. La presión alta que aplicamos hoy es un legado de esos años en España.",
    content_en: "The VAR review process needs improvement. Too many delays, too much controversy. Our tactical approach worked well, but possession alone doesn't win games. We need more clinical finishing. At Villa Park, I remembered my time in Sevilla, where we developed a similar style of play. The high pressing we applied today is a legacy of those years in Spain.",
    locations: ["Villa Park", "Sevilla", "Birmingham"]
  },
  {
    id: 8,
    date: "2023-09-30",
    speaker: "Roberto De Zerbi",
    tags: ["Tactics", "Possession", "Post-Match"],
    content: "Possession with purpose is our identity. The transition moments define modern football. VAR is part of the game now, but we can't let it distract us. Every match is a step toward the title.",
    content_es: "La posesión con propósito es nuestra identidad. Los momentos de transición definen el fútbol moderno. El VAR es parte del juego ahora, pero no podemos dejar que nos distraiga. Cada partido es un paso hacia el título. En el Amex Stadium, nuestro estilo de juego refleja años de trabajo táctico en Italia.",
    content_en: "Possession with purpose is our identity. The transition moments define modern football. VAR is part of the game now, but we can't let it distract us. Every match is a step toward the title. At the Amex Stadium, our playing style reflects years of tactical work in Italy.",
    locations: ["Amex Stadium", "Brighton", "Italy"]
  },
  {
    id: 9,
    date: "2023-10-07",
    speaker: "Mauricio Pochettino",
    tags: ["Injury", "Tactics", "Post-Match"],
    content: "Injuries are testing our squad depth. We're adapting our tactics to compensate. Possession control remains important, but we must be more efficient in transition. VAR decisions have been inconsistent.",
    content_es: "Las lesiones están poniendo a prueba la profundidad de nuestro equipo. Estamos adaptando nuestras tácticas para compensar. El control de la posesión sigue siendo importante, pero debemos ser más eficientes en la transición. Las decisiones del VAR han sido inconsistentes. En Stamford Bridge, necesitamos encontrar un equilibrio entre la presión alta y la conservación de energía.",
    content_en: "Injuries are testing our squad depth. We're adapting our tactics to compensate. Possession control remains important, but we must be more efficient in transition. VAR decisions have been inconsistent. At Stamford Bridge, we need to find a balance between high pressing and energy conservation.",
    locations: ["Stamford Bridge", "London", "Chelsea"]
  },
  {
    id: 10,
    date: "2023-10-14",
    speaker: "Marco Silva",
    tags: ["VAR", "Post-Match", "Controversy"],
    content: "Another VAR controversy. The process needs clarity. Our possession game was solid, but we lacked the final pass. The title race is tight, and every decision matters. We must move forward.",
    content_es: "Otra controversia del VAR. El proceso necesita claridad. Nuestro juego de posesión fue sólido, pero nos faltó el pase final. La carrera por el título está ajustada y cada decisión importa. Debemos seguir adelante. En Craven Cottage, estamos construyendo un proyecto ambicioso que requiere paciencia y precisión táctica.",
    content_en: "Another VAR controversy. The process needs clarity. Our possession game was solid, but we lacked the final pass. The title race is tight, and every decision matters. We must move forward. At Craven Cottage, we are building an ambitious project that requires patience and tactical precision.",
    locations: ["Craven Cottage", "London"]
  },
  {
    id: 11,
    date: "2023-10-21",
    speaker: "Andoni Iraola",
    tags: ["Tactics", "Possession", "Post-Match"],
    content: "Tactical discipline is crucial. We maintained good possession, but our transition defense was caught out. VAR reviewed the incident, but the decision stood. Injuries are a concern.",
    content_es: "La disciplina táctica es crucial. Mantuvimos buena posesión, pero nuestra defensa en transición fue sorprendida. El VAR revisó el incidente, pero la decisión se mantuvo. Las lesiones son una preocupación. En el Vitality Stadium, aplicamos principios que aprendí durante mi tiempo en el Athletic Club de Bilbao.",
    content_en: "Tactical discipline is crucial. We maintained good possession, but our transition defense was caught out. VAR reviewed the incident, but the decision stood. Injuries are a concern. At the Vitality Stadium, we apply principles I learned during my time at Athletic Club de Bilbao.",
    locations: ["Vitality Stadium", "Bournemouth", "Bilbao"]
  },
  {
    id: 12,
    date: "2023-10-28",
    speaker: "Thomas Frank",
    tags: ["Tactics", "VAR", "Post-Match"],
    content: "The VAR system needs refinement. Too many interruptions. Our tactical approach was sound, possession was decent, but we need more creativity in transition. The title dream continues.",
    content_es: "El sistema VAR necesita refinamiento. Demasiadas interrupciones. Nuestro enfoque táctico fue sólido, la posesión fue decente, pero necesitamos más creatividad en la transición. El sueño del título continúa. En el Gtech Community Stadium, nuestro proyecto sigue creciendo con cada partido.",
    content_en: "The VAR system needs refinement. Too many interruptions. Our tactical approach was sound, possession was decent, but we need more creativity in transition. The title dream continues. At the Gtech Community Stadium, our project continues to grow with each match.",
    locations: ["Gtech Community Stadium", "Brentford", "London"]
  },
  {
    id: 13,
    date: "2023-11-04",
    speaker: "Vincent Kompany",
    tags: ["Injury", "Tactics", "Possession"],
    content: "Injuries have hit us hard. We're adjusting our tactics to cope. Possession without penetration is pointless. The transition game is where we've struggled. VAR calls have been mixed.",
    content_es: "Las lesiones nos han golpeado fuerte. Estamos ajustando nuestras tácticas para hacer frente. La posesión sin penetración no tiene sentido. El juego de transición es donde hemos tenido problemas. Las llamadas del VAR han sido mixtas. En Turf Moor, enfrentamos desafíos que requieren adaptación táctica constante.",
    content_en: "Injuries have hit us hard. We're adjusting our tactics to cope. Possession without penetration is pointless. The transition game is where we've struggled. VAR calls have been mixed. At Turf Moor, we face challenges that require constant tactical adaptation.",
    locations: ["Turf Moor", "Burnley"]
  },
  {
    id: 14,
    date: "2023-11-11",
    speaker: "Roy Hodgson",
    tags: ["Post-Match", "VAR", "Controversy"],
    content: "VAR controversy again. The officials need better communication. Our possession stats were good, but we couldn't convert. Tactical adjustments needed. The title race demands consistency.",
    content_es: "Controversia del VAR de nuevo. Los oficiales necesitan mejor comunicación. Nuestras estadísticas de posesión fueron buenas, pero no pudimos convertir. Se necesitan ajustes tácticos. La carrera por el título exige consistencia. En Selhurst Park, la experiencia importa, pero también necesitamos innovación táctica.",
    content_en: "VAR controversy again. The officials need better communication. Our possession stats were good, but we couldn't convert. Tactical adjustments needed. The title race demands consistency. At Selhurst Park, experience matters, but we also need tactical innovation.",
    locations: ["Selhurst Park", "London"]
  },
  {
    id: 15,
    date: "2023-11-18",
    speaker: "Sean Dyche",
    tags: ["Tactics", "Post-Match", "Possession"],
    content: "Tactical discipline won us the game. We controlled possession when needed, and our transition defense was solid. VAR checked everything, but no major controversies. Injuries are manageable.",
    content_es: "La disciplina táctica nos ganó el partido. Controlamos la posesión cuando fue necesario y nuestra defensa en transición fue sólida. El VAR revisó todo, pero sin grandes controversias. Las lesiones son manejables. En Goodison Park, la organización táctica es la base de nuestro éxito.",
    content_en: "Tactical discipline won us the game. We controlled possession when needed, and our transition defense was solid. VAR checked everything, but no major controversies. Injuries are manageable. At Goodison Park, tactical organization is the foundation of our success.",
    locations: ["Goodison Park", "Liverpool"]
  },
  {
    id: 16,
    date: "2023-11-25",
    speaker: "David Moyes",
    tags: ["VAR", "Tactics", "Post-Match"],
    content: "The VAR decision changed the game. We had good possession, but the controversy overshadowed our performance. Tactical changes are needed. The title race is still open.",
    content_es: "La decisión del VAR cambió el juego. Tuvimos buena posesión, pero la controversia eclipsó nuestro rendimiento. Se necesitan cambios tácticos. La carrera por el título sigue abierta. En el London Stadium, debemos mantener nuestra identidad táctica mientras adaptamos a las nuevas circunstancias.",
    content_en: "The VAR decision changed the game. We had good possession, but the controversy overshadowed our performance. Tactical changes are needed. The title race is still open. At the London Stadium, we must maintain our tactical identity while adapting to new circumstances.",
    locations: ["London Stadium", "London"]
  },
  {
    id: 17,
    date: "2023-12-02",
    speaker: "Gary O'Neil",
    tags: ["Injury", "Possession", "Tactics"],
    content: "Injuries are piling up. We're adapting our tactics to survive. Possession control has been difficult, and our transition game needs work. VAR has been fair to us recently.",
    content_es: "Las lesiones se están acumulando. Estamos adaptando nuestras tácticas para sobrevivir. El control de la posesión ha sido difícil y nuestro juego de transición necesita trabajo. El VAR ha sido justo con nosotros recientemente. En el Molineux Stadium, cada partido es una oportunidad para demostrar nuestra resiliencia táctica.",
    content_en: "Injuries are piling up. We're adapting our tactics to survive. Possession control has been difficult, and our transition game needs work. VAR has been fair to us recently. At Molineux Stadium, every match is an opportunity to demonstrate our tactical resilience.",
    locations: ["Molineux Stadium", "Wolverhampton"]
  },
  {
    id: 18,
    date: "2023-12-09",
    speaker: "Nuno Espirito Santo",
    tags: ["Tactics", "VAR", "Post-Match"],
    content: "Tactical flexibility is key. We adjusted well during the match. Possession was balanced, but VAR decisions created tension. The title race requires mental strength as much as skill.",
    content_es: "La flexibilidad táctica es clave. Nos ajustamos bien durante el partido. La posesión estuvo equilibrada, pero las decisiones del VAR crearon tensión. La carrera por el título requiere fortaleza mental tanto como habilidad. En el City Ground, nuestro enfoque táctico refleja años de experiencia en diferentes ligas europeas.",
    content_en: "Tactical flexibility is key. We adjusted well during the match. Possession was balanced, but VAR decisions created tension. The title race requires mental strength as much as skill. At the City Ground, our tactical approach reflects years of experience in different European leagues.",
    locations: ["City Ground", "Nottingham"]
  },
  {
    id: 19,
    date: "2023-12-16",
    speaker: "Chris Wilder",
    tags: ["Controversy", "VAR", "Post-Match"],
    content: "VAR controversy dominated the post-match discussion. Our possession game was decent, but we couldn't break through. Tactical changes are coming. Injuries are a concern.",
    content_es: "La controversia del VAR dominó la discusión post-partido. Nuestro juego de posesión fue decente, pero no pudimos romper. Los cambios tácticos están llegando. Las lesiones son una preocupación. En Bramall Lane, necesitamos encontrar el equilibrio correcto entre posesión y eficacia en el ataque.",
    content_en: "VAR controversy dominated the post-match discussion. Our possession game was decent, but we couldn't break through. Tactical changes are coming. Injuries are a concern. At Bramall Lane, we need to find the right balance between possession and attacking efficiency.",
    locations: ["Bramall Lane", "Sheffield"]
  },
  {
    id: 20,
    date: "2023-12-23",
    speaker: "Paul Heckingbottom",
    tags: ["Tactics", "Possession", "Post-Match"],
    content: "Our tactical approach worked well. We maintained good possession and our transition defense was solid. VAR reviewed a key moment, but the decision was correct. The title race heats up.",
    content_es: "Nuestro enfoque táctico funcionó bien. Mantuvimos buena posesión y nuestra defensa en transición fue sólida. El VAR revisó un momento clave, pero la decisión fue correcta. La carrera por el título se calienta. En Bramall Lane, la cohesión táctica del equipo fue evidente en cada fase del juego.",
    content_en: "Our tactical approach worked well. We maintained good possession and our transition defense was solid. VAR reviewed a key moment, but the decision was correct. The title race heats up. At Bramall Lane, the team's tactical cohesion was evident in every phase of play.",
    locations: ["Bramall Lane", "Sheffield"]
  }
];


const Archive = () => {
  const [selectedSpeakers, setSelectedSpeakers] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentPipelineStep, setCurrentPipelineStep] = useState('');
  const [chartType, setChartType] = useState('word'); // 'word' or 'entity'
  const [aiQuery, setAiQuery] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isMethodologyModalOpen, setIsMethodologyModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('raw'); // 'raw', 'python', 'output'
  const [bilingualMode, setBilingualMode] = useState({}); // { docId: 'ES' | 'EN' | 'BOTH' }
  const [ngramQuery, setNgramQuery] = useState('');
  const [ngramData, setNgramData] = useState([]);
  const [showSpatialTab, setShowSpatialTab] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [ragMessages, setRagMessages] = useState([]);
  const [ragInput, setRagInput] = useState('');
  const [ragLoading, setRagLoading] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [correctionText, setCorrectionText] = useState('');
  const [showDataHealth, setShowDataHealth] = useState(false);
  const chatEndRef = useRef(null);

  // Extract unique values for filters
  const uniqueSpeakers = useMemo(() => {
    return [...new Set(archiveData.map(item => item.speaker))].sort();
  }, []);

  const uniqueYears = useMemo(() => {
    return [...new Set(archiveData.map(item => item.date.split('-')[0]))].sort();
  }, []);

  const uniqueTags = useMemo(() => {
    const allTags = archiveData.flatMap(item => item.tags);
    return [...new Set(allTags)].sort();
  }, []);

  // Filter documents based on selected filters
  const filteredDocuments = useMemo(() => {
    return archiveData.filter(doc => {
      const docYear = doc.date.split('-')[0];
      
      const speakerMatch = selectedSpeakers.length === 0 || selectedSpeakers.includes(doc.speaker);
      const yearMatch = selectedYears.length === 0 || selectedYears.includes(docYear);
      const tagMatch = selectedTags.length === 0 || selectedTags.some(tag => doc.tags.includes(tag));
      const locationMatch = selectedLocations.length === 0 || selectedLocations.some(loc => 
        doc.locations && doc.locations.some(docLoc => 
          docLoc.toLowerCase().includes(loc.toLowerCase()) || loc.toLowerCase().includes(docLoc.toLowerCase())
        )
      );
      
      return speakerMatch && yearMatch && tagMatch && locationMatch;
    });
  }, [selectedSpeakers, selectedYears, selectedTags, selectedLocations]);

  // Proximity search with context (5 words before and after)
  const performProximitySearch = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = [];
    const searchTerm = query.toLowerCase();
    const words = searchTerm.split(/\s+/);

    filteredDocuments.forEach(doc => {
      const contentWords = doc.content.split(/\s+/);
      
      // Find all matches
      contentWords.forEach((word, index) => {
        const wordLower = word.replace(/[.,!?;:]/g, '').toLowerCase();
        
        // Check for single word match or phrase match
        if (words.length === 1) {
          if (wordLower === searchTerm || wordLower.includes(searchTerm)) {
            const start = Math.max(0, index - 5);
            const end = Math.min(contentWords.length, index + 6);
            const snippet = contentWords.slice(start, end).join(' ');
            
            results.push({
              docId: doc.id,
              doc: doc,
              snippet: snippet,
              matchIndex: index,
              context: {
                before: contentWords.slice(start, index).join(' '),
                match: contentWords[index],
                after: contentWords.slice(index + 1, end).join(' ')
              }
            });
          }
        } else {
          // Phrase search
          const phrase = contentWords.slice(index, index + words.length).join(' ').toLowerCase();
          if (phrase.includes(searchTerm)) {
            const start = Math.max(0, index - 5);
            const end = Math.min(contentWords.length, index + words.length + 5);
            const snippet = contentWords.slice(start, end).join(' ');
            
            results.push({
              docId: doc.id,
              doc: doc,
              snippet: snippet,
              matchIndex: index,
              context: {
                before: contentWords.slice(start, index).join(' '),
                match: contentWords.slice(index, index + words.length).join(' '),
                after: contentWords.slice(index + words.length, end).join(' ')
              }
            });
          }
        }
      });
    });

    // Remove duplicates
    const uniqueResults = results.filter((result, index, self) =>
      index === self.findIndex(r => r.docId === result.docId && r.matchIndex === result.matchIndex)
    );

    setSearchResults(uniqueResults);
  };

  // Handle search input
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    performProximitySearch(value);
  };

  // Combined function to highlight both search terms and location entities
  const highlightTextAndLocations = (text, searchTerm, locations) => {
    if (!text) return text;
    
    let parts = [text];
    
    // First, highlight search terms
    if (searchTerm.trim()) {
      const searchRegex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const newParts = [];
      parts.forEach(part => {
        if (typeof part === 'string') {
          const splitParts = part.split(searchRegex);
          splitParts.forEach((splitPart, idx) => {
            if (searchRegex.test(splitPart)) {
              newParts.push(
                <mark key={`search-${idx}`} className="bg-yellow-400 text-gray-900 font-semibold px-1 rounded">
                  {splitPart}
                </mark>
              );
            } else {
              newParts.push(splitPart);
            }
          });
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    }
    
    // Then, highlight locations
    if (locations && locations.length > 0) {
      const locationPattern = new RegExp(`\\b(${locations.map(loc => loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
      const newParts = [];
      
      parts.forEach((part, partIndex) => {
        if (typeof part === 'string') {
          const splitParts = part.split(locationPattern);
          splitParts.forEach((splitPart, idx) => {
            const matchedLocation = locations.find(loc => 
              splitPart.toLowerCase() === loc.toLowerCase()
            );
            
            if (matchedLocation) {
              newParts.push(
                <span
                  key={`location-${partIndex}-${idx}`}
                  className="underline decoration-[#00FF85] decoration-2 underline-offset-2 cursor-help relative group"
                  title={`Geographic Entity: ${matchedLocation}`}
                >
                  {splitPart}
                </span>
              );
            } else {
              newParts.push(splitPart);
            }
          });
        } else {
          // If it's already a React element (like a mark), keep it as is
          newParts.push(part);
        }
      });
      parts = newParts;
    }
    
    return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
  };

  // Calculate N-Gram trends over time
  const calculateNgramTrends = useMemo(() => {
    if (!ngramQuery.trim()) {
      return [];
    }

    const query = ngramQuery.toLowerCase();
    const trends = {};
    
    archiveData.forEach(doc => {
      const content = doc.content_en || doc.content || '';
      const contentLower = content.toLowerCase();
      
      // Count occurrences of the query term
      const matches = contentLower.match(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
      const count = matches ? matches.length : 0;
      
      if (count > 0) {
        const month = doc.date.substring(0, 7); // YYYY-MM
        trends[month] = (trends[month] || 0) + count;
      }
    });

    return Object.entries(trends)
      .map(([month, frequency]) => ({ month, frequency }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [ngramQuery]);

  // Update N-Gram data when query changes
  useEffect(() => {
    setNgramData(calculateNgramTrends);
  }, [calculateNgramTrends]);

  // Calculate word frequency for filtered documents
  const wordFrequency = useMemo(() => {
    const wordCount = {};
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'we', 'our', 'us', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'they', 'them']);

    filteredDocuments.forEach(doc => {
      const words = doc.content.toLowerCase().split(/\W+/).filter(word => 
        word.length > 3 && !stopWords.has(word)
      );
      
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
    });

    return Object.entries(wordCount)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredDocuments]);

  // Calculate entity frequency (people/places mentioned)
  const entityFrequency = useMemo(() => {
    const entityCount = {};
    // Extract potential entities (capitalized words, proper nouns)
    filteredDocuments.forEach(doc => {
      const words = doc.content.split(/\s+/);
      words.forEach(word => {
        const cleanWord = word.replace(/[.,!?;:]/g, '');
        // Simple heuristic: capitalized words that appear multiple times
        if (cleanWord.length > 3 && /^[A-Z]/.test(cleanWord)) {
          entityCount[cleanWord] = (entityCount[cleanWord] || 0) + 1;
        }
      });
    });

    return Object.entries(entityCount)
      .map(([entity, count]) => ({ word: entity, count }))
      .filter(item => item.count > 1) // Only show entities mentioned more than once
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredDocuments]);

  // Get current chart data based on toggle
  const chartData = chartType === 'word' ? wordFrequency : entityFrequency;

  // Calculate timeline heatmap data
  const timelineData = useMemo(() => {
    const monthCounts = {};
    
    filteredDocuments.forEach(doc => {
      const month = doc.date.substring(0, 7); // YYYY-MM
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });

    return Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredDocuments]);

  // Toggle filter functions
  const toggleSpeaker = (speaker) => {
    setSelectedSpeakers(prev => 
      prev.includes(speaker) 
        ? prev.filter(s => s !== speaker)
        : [...prev, speaker]
    );
  };

  const toggleYear = (year) => {
    setSelectedYears(prev => 
      prev.includes(year) 
        ? prev.filter(y => y !== year)
        : [...prev, year]
    );
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearAllFilters = () => {
    setSelectedSpeakers([]);
    setSelectedYears([]);
    setSelectedTags([]);
    setSelectedLocations([]);
  };

  // Get all unique locations from archive data
  const uniqueLocations = useMemo(() => {
    const allLocations = archiveData.flatMap(item => item.locations || []);
    return [...new Set(allLocations)].sort();
  }, []);

  // Handle location filter from map click
  const handleLocationClick = (location) => {
    if (selectedLocations.includes(location)) {
      setSelectedLocations(prev => prev.filter(loc => loc !== location));
    } else {
      setSelectedLocations(prev => [...prev, location]);
    }
  };

  // Reset all filters
  const resetAllFilters = () => {
    setSelectedSpeakers([]);
    setSelectedYears([]);
    setSelectedTags([]);
    setSelectedLocations([]);
    setSearchQuery('');
  };

  // Handle RAG query
  const handleRAGQuery = async (e) => {
    e.preventDefault();
    if (!ragInput.trim() || ragLoading) return;

    const userMessage = ragInput.trim();
    setRagInput('');
    setRagMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setRagLoading(true);

    try {
      // Prepare context from filtered documents
      const context = filteredDocuments.map(doc => ({
        id: doc.id,
        date: doc.date,
        speaker: doc.speaker,
        content: doc.content_en || doc.content,
        tags: doc.tags
      }));

      const response = await axios.post('/api/ai/archive-rag', {
        query: userMessage,
        context: context
      });

      if (response.data.success) {
        setRagMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.data.answer,
          sources: response.data.data.sources || []
        }]);
      } else {
        throw new Error(response.data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('RAG query error:', error);
      setRagMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Archive Assistant is currently re-indexing. Please try again in a moment.',
        sources: []
      }]);
    } finally {
      setRagLoading(false);
    }
  };

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ragMessages]);

  // Handle OCR correction
  const handleCorrectionSubmit = (docId, originalText, correctedText) => {
    // In a real implementation, this would send to backend
    setEditingSegment(null);
    setCorrectionText('');
    // Show success toast
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Extract text segments for OCR correction (split by sentences)
  const getTextSegments = (text) => {
    if (!text) return [];
    return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  };

  // Mock pending files for batch processing
  const pendingFiles = [
    'inquisition_vol1.pdf',
    'testimony_1540.txt',
    'transcript_guardiola_2023.pdf',
    'post_match_analysis_sep.txt',
    'tactical_notes_oct.pdf'
  ];

  // Pipeline steps
  const pipelineSteps = [
    'OCR Scanning...',
    'Metadata Extraction...',
    'Entity Recognition...',
    'Text Normalization...',
    'Indexing...'
  ];

  // Simulate batch processing
  const handleProcessFiles = () => {
    setIsProcessing(true);
    setProcessingProgress(0);
    let stepIndex = 0;

    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        const newProgress = prev + 20;
        
        if (newProgress % 20 === 0 && stepIndex < pipelineSteps.length) {
          setCurrentPipelineStep(pipelineSteps[stepIndex]);
          stepIndex++;
        }

        if (newProgress >= 100) {
          clearInterval(interval);
          setCurrentPipelineStep('Processing Complete');
          setTimeout(() => {
            setIsProcessing(false);
            setProcessingProgress(0);
            setCurrentPipelineStep('');
          }, 2000);
          return 100;
        }

        return newProgress;
      });
    }, 500);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Speaker', 'Tags', 'Content'];
    const rows = filteredDocuments.map(doc => [
      doc.id,
      doc.date,
      doc.speaker,
      doc.tags.join('; '),
      doc.content.replace(/"/g, '""') // Escape quotes
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `archive_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate confidence scores for documents (mocked: 85-99%)
  const getConfidenceScore = (docId) => {
    // Deterministic random scores based on docId for consistency
    const scores = [97, 92, 98, 89, 95, 96, 88, 99, 93, 87, 96, 94, 91, 86, 97, 95, 90, 98, 85, 96];
    return scores[docId - 1] || 95;
  };

  // Get confidence color based on score
  const getConfidenceColor = (score) => {
    if (score >= 95) return { bg: 'bg-green-500/80', text: 'text-green-400', border: 'border-green-500/50', label: 'High Confidence' };
    if (score >= 90) return { bg: 'bg-yellow-500/80', text: 'text-yellow-400', border: 'border-yellow-500/50', label: 'Needs Review' };
    return { bg: 'bg-red-500/80', text: 'text-red-400', border: 'border-red-500/50', label: 'Manual Intervention Required' };
  };

  // Export annotated dataset for peer review (JSONL format)
  const handleExportJSONL = () => {
    const annotatedData = filteredDocuments.map(doc => ({
      id: doc.id,
      date: doc.date,
      speaker: doc.speaker,
      tags: doc.tags,
      locations: doc.locations,
      content: doc.content,
      content_es: doc.content_es || null,
      content_en: doc.content_en || null,
      metadata: {
        confidence_score: getConfidenceScore(doc.id),
        speaker_id_linked: true,
        coordinates_assigned: doc.locations && doc.locations.length > 0,
        iso_8601_date: /^\d{4}-\d{2}-\d{2}$/.test(doc.date),
        last_modified_by: 'Python Pipeline v2.1',
        last_modified_date: '2026-01-14T10:30:00Z',
        ingestion_id: doc.id,
        pipeline_version: 'v2.1'
      }
    }));

    const jsonlContent = annotatedData.map(item => JSON.stringify(item)).join('\n');
    
    const blob = new Blob([jsonlContent], { type: 'application/jsonl;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `archive_annotated_${new Date().toISOString().split('T')[0]}.jsonl`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate schema validator metrics
  const getSchemaMetrics = () => {
    const docs = filteredDocuments;
    const total = docs.length;
    if (total === 0) return { speakerIdLinked: 0, coordinatesAssigned: 0, isoDateFormat: 0 };

    return {
      speakerIdLinked: 100, // All speakers are linked
      coordinatesAssigned: Math.round((docs.filter(d => d.locations && d.locations.length > 0).length / total) * 100),
      isoDateFormat: Math.round((docs.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d.date)).length / total) * 100)
    };
  };

  // Handle AI Query
  const handleAiQuery = (e) => {
    e.preventDefault();
    if (aiQuery.trim()) {
      setShowToast(true);
      setAiQuery('');
      setTimeout(() => setShowToast(false), 4000);
    }
  };

  // Toast notification effect
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] text-white p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-[1920px] mx-auto"
      >
        {/* Professional Status Bar Header */}
        <div className="mb-6 bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#00FF85]/20 rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-900/30 border border-green-500/50 rounded-lg">
                <FaCheckCircle className="text-green-400 text-sm" />
                <span className="text-xs font-mono text-green-400">Phase 1: Text Normalization [SUCCESS]</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                <FaSpinner className="text-blue-400 text-sm animate-spin" />
                <span className="text-xs font-mono text-blue-400">Phase 2: Metadata Faceting [LIVE]</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-900/30 border border-amber-500/50 rounded-lg">
                <FaSpinner className="text-amber-400 text-sm animate-pulse" />
                <span className="text-xs font-mono text-amber-400">Phase 3: RAG & Geospatial [BETA]</span>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <FaBook className="text-[#00FF85] text-3xl" />
              <h1 className="text-4xl font-heading font-bold text-white">The Archive</h1>
            </div>
            <div className="flex items-center space-x-3">
              <NeonTooltip content="Open Geospatial Dashboard">
                <button
                  onClick={() => setShowSpatialTab(!showSpatialTab)}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#00FF85]/40 rounded-lg text-[#00FF85] transition-all font-mono text-sm"
                >
                  <FaMap className="text-lg" />
                  <span>Spatial Analysis</span>
                </button>
              </NeonTooltip>
              <button
                onClick={() => setShowAIChat(!showAIChat)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#00FF85]/40 rounded-lg text-[#00FF85] transition-all font-mono text-sm"
              >
                <FaRobot className="text-lg" />
                <span>Archive AI</span>
              </button>
              <button
                onClick={() => setShowDataHealth(!showDataHealth)}
                className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-all font-mono text-sm ${
                  showDataHealth 
                    ? 'bg-[#00FF85]/20 border-[#00FF85] text-[#00FF85]' 
                    : 'bg-[#1a1a1a] hover:bg-[#2a2a2a] border-[#00FF85]/40 text-[#00FF85]'
                }`}
              >
                <FaShieldAlt className="text-lg" />
                <span>Data Health</span>
              </button>
              <NeonTooltip content="View Python Methodology">
                <button
                  onClick={() => setIsMethodologyModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#00FF85]/40 rounded-lg text-[#00FF85] transition-all font-mono text-sm"
                  style={{ fontFamily: 'Chakra Petch, monospace' }}
                >
                  <FaCode className="text-lg" />
                  <span>🛠️ View Processing Pipeline</span>
                </button>
              </NeonTooltip>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#00FF85]/10 hover:bg-[#00FF85]/20 border border-[#00FF85]/30 rounded-lg text-[#00FF85] transition-all"
              >
                <FaCog className="text-lg" />
                <span>Corpus Settings</span>
              </button>
            </div>
          </div>
          <p className="text-gray-400 text-lg">Digital Humanities Text Analysis Dashboard</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#00FF85]/60 text-xl" />
            <input
              type="text"
              placeholder="Search transcripts... (Proximity search with context)"
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-12 pr-4 py-4 bg-[#1a1a1a] border-2 border-[#00FF85]/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00FF85] focus:border-[#00FF85] transition-all text-lg"
            />
          </div>
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Faceted Filter */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3 bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#00FF85]/20 rounded-lg p-6 h-fit lg:sticky lg:top-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <FaFilter className="text-[#00FF85] text-xl" />
                <h2 className="text-xl font-heading font-semibold">Filters</h2>
              </div>
              {(selectedSpeakers.length > 0 || selectedYears.length > 0 || selectedTags.length > 0) && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-[#00FF85] hover:text-[#00CC6A] transition-colors px-3 py-2 min-h-[44px] flex items-center"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Speaker Filter */}
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <FaUser className="text-[#00FF85]/60 text-sm" />
                <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Speaker</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uniqueSpeakers.map(speaker => (
                  <label
                    key={speaker}
                    className="flex items-center space-x-2 cursor-pointer group hover:text-[#00FF85] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSpeakers.includes(speaker)}
                      onChange={() => toggleSpeaker(speaker)}
                      className="w-4 h-4 rounded border-[#00FF85]/30 bg-[#0a0a0a] text-[#00FF85] focus:ring-[#00FF85] focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-sm text-white/70 group-hover:text-[#00FF85]">{speaker}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Year Filter */}
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <FaCalendarAlt className="text-[#00FF85]/60 text-sm" />
                <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Year</h3>
              </div>
              <div className="space-y-2">
                {uniqueYears.map(year => (
                  <label
                    key={year}
                    className="flex items-center space-x-2 cursor-pointer group hover:text-[#00FF85] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedYears.includes(year)}
                      onChange={() => toggleYear(year)}
                      className="w-4 h-4 rounded border-[#00FF85]/30 bg-[#0a0a0a] text-[#00FF85] focus:ring-[#00FF85] focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-sm text-white/70 group-hover:text-[#00FF85]">{year}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tags Filter */}
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <FaTag className="text-[#00FF85]/60 text-sm" />
                <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Tags</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uniqueTags.map(tag => (
                  <label
                    key={tag}
                    className="flex items-center space-x-2 cursor-pointer group hover:text-[#00FF85] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                      className="w-4 h-4 rounded border-[#00FF85]/30 bg-[#0a0a0a] text-[#00FF85] focus:ring-[#00FF85] focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-sm text-white/70 group-hover:text-[#00FF85]">{tag}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Location Filter */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <FaMapMarkerAlt className="text-[#00FF85]/60 text-sm" />
                <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Locations</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uniqueLocations.map(location => (
                  <label
                    key={location}
                    className="flex items-center space-x-2 cursor-pointer group hover:text-[#00FF85] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes(location)}
                      onChange={() => {
                        if (selectedLocations.includes(location)) {
                          setSelectedLocations(prev => prev.filter(loc => loc !== location));
                        } else {
                          setSelectedLocations(prev => [...prev, location]);
                        }
                      }}
                      className="w-4 h-4 rounded border-[#00FF85]/30 bg-[#0a0a0a] text-[#00FF85] focus:ring-[#00FF85] focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-sm text-white/70 group-hover:text-[#00FF85]">{location}</span>
                  </label>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Center Column: Chronological Reader */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-6 bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#00FF85]/20 rounded-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading font-semibold">Documents ({filteredDocuments.length})</h2>
              <div className="text-sm text-white/60">
                Sorted chronologically
              </div>
            </div>

            <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              <AnimatePresence>
                {filteredDocuments.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col items-center justify-center py-16 px-6"
                  >
                    <div className="bg-[#0a0a0a]/60 border border-[#00FF85]/20 rounded-lg p-8 text-center max-w-md">
                      <FaSearch className="text-6xl text-[#00FF85]/40 mx-auto mb-4" />
                      <h3 className="text-2xl font-heading font-bold text-white mb-3">
                        No Matches Found
                      </h3>
                      <p className="text-white/70 mb-6" style={{ fontFamily: 'Merriweather, serif' }}>
                        Your current filter combination returned zero documents. Try adjusting your filters or search query.
                      </p>
                      <button
                        onClick={resetAllFilters}
                        className="px-6 py-3 bg-[#00FF85] text-gray-900 rounded-lg hover:bg-[#00CC6A] transition-all font-semibold"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </motion.div>
                ) : filteredDocuments.map((doc, index) => {
                  const hasBilingual = doc.content_es && doc.content_en;
                  const currentMode = bilingualMode[doc.id] || (hasBilingual ? 'EN' : null);
                  
                  return (
                    <motion.div
                      id={`doc-${doc.id}`}
                      key={doc.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-[#0a0a0a]/60 border border-[#00FF85]/10 rounded-lg p-5 hover:border-[#00FF85]/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <FaUser className="text-[#00FF85]/60 text-sm" />
                            <span className="font-semibold text-white">{doc.speaker}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-white/60 mb-2" style={{ fontFamily: 'Chakra Petch, monospace' }}>
                            <FaCalendarAlt className="text-[#00FF85]/40" />
                            <span>{doc.date}</span>
                          </div>
                          {/* Bilingual Toggle */}
                          {hasBilingual && (
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-xs text-white/60 uppercase tracking-wider" style={{ fontFamily: 'Chakra Petch, monospace' }}>
                                Language:
                              </span>
                              <div className="flex items-center space-x-1 bg-[#1a1a1a] rounded-lg p-1 border border-[#00FF85]/20">
                                <button
                                  onClick={() => setBilingualMode(prev => ({ ...prev, [doc.id]: 'ES' }))}
                                  className={`px-3 py-2 text-xs rounded transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                                    currentMode === 'ES'
                                      ? 'bg-[#00FF85] text-gray-900 font-semibold'
                                      : 'text-white/60 hover:text-white'
                                  }`}
                                >
                                  ES
                                </button>
                                <button
                                  onClick={() => setBilingualMode(prev => ({ ...prev, [doc.id]: 'EN' }))}
                                  className={`px-3 py-2 text-xs rounded transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                                    currentMode === 'EN'
                                      ? 'bg-[#00FF85] text-gray-900 font-semibold'
                                      : 'text-white/60 hover:text-white'
                                  }`}
                                >
                                  EN
                                </button>
                                <button
                                  onClick={() => setBilingualMode(prev => ({ ...prev, [doc.id]: 'BOTH' }))}
                                  className={`px-3 py-2 text-xs rounded transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                                    currentMode === 'BOTH'
                                      ? 'bg-[#00FF85] text-gray-900 font-semibold'
                                      : 'text-white/60 hover:text-white'
                                  }`}
                                >
                                  BOTH
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {doc.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2.5 py-1 bg-amber-900/20 text-amber-200/80 text-xs rounded-sm border border-amber-800/40 font-mono tracking-wide flex items-center space-x-1 group relative"
                              style={{ fontFamily: 'monospace' }}
                            >
                              {tag}
                              <NeonTooltip content="Suggest OCR Correction">
                                <button
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[#00FF85] hover:text-[#00CC6A]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Placeholder for edit metadata functionality
                                    alert(`Edit metadata for tag: ${tag}`);
                                  }}
                                >
                                  <FaEdit className="text-xs" />
                                </button>
                              </NeonTooltip>
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Document Content with OCR Correction */}
                      <div className="text-white/90 leading-relaxed text-base" style={{ fontFamily: 'Merriweather, serif' }}>
                        {hasBilingual && currentMode === 'BOTH' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:border-r border-[#00FF85]/20 md:pr-4 pb-4 md:pb-0 border-b md:border-b-0">
                              <div className="text-xs text-[#00FF85]/60 mb-2 uppercase tracking-wider" style={{ fontFamily: 'Chakra Petch, monospace' }}>
                                Español
                              </div>
                              <div className="text-white/90 space-y-2">
                                {getTextSegments(doc.content_es).map((segment, segIdx) => (
                                  <div key={segIdx} className="group relative">
                                    <span>{highlightTextAndLocations(segment, searchQuery, doc.locations)}</span>
                                    <NeonTooltip content="Suggest OCR Correction">
                                      <button
                                        onClick={() => setEditingSegment(`${doc.id}-es-${segIdx}`)}
                                        className="opacity-0 group-hover:opacity-100 absolute -right-6 top-0 text-[#00FF85] hover:text-[#00CC6A] transition-opacity"
                                      >
                                        <FaEdit className="text-xs" />
                                      </button>
                                    </NeonTooltip>
                                    {editingSegment === `${doc.id}-es-${segIdx}` && (
                                      <div className="mt-2 p-3 bg-[#1a1a1a] border border-[#00FF85]/30 rounded-lg">
                                        <textarea
                                          defaultValue={segment}
                                          onChange={(e) => setCorrectionText(e.target.value)}
                                          className="w-full bg-[#0a0a0a] text-white p-2 rounded text-sm mb-2"
                                          rows={3}
                                        />
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() => handleCorrectionSubmit(doc.id, segment, correctionText || segment)}
                                            className="px-3 py-1 bg-[#00FF85] text-gray-900 rounded text-xs font-semibold hover:bg-[#00CC6A]"
                                          >
                                            Submit Correction
                                          </button>
                                          <button
                                            onClick={() => {
                                              setEditingSegment(null);
                                              setCorrectionText('');
                                            }}
                                            className="px-3 py-1 bg-[#1a1a1a] border border-[#00FF85]/30 text-[#00FF85] rounded text-xs hover:bg-[#2a2a2a]"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-[#00FF85]/60 mb-2 uppercase tracking-wider" style={{ fontFamily: 'Chakra Petch, monospace' }}>
                                English
                              </div>
                              <div className="text-white/90 space-y-2">
                                {getTextSegments(doc.content_en).map((segment, segIdx) => (
                                  <div key={segIdx} className="group relative">
                                    <span>{highlightTextAndLocations(segment, searchQuery, doc.locations)}</span>
                                    <NeonTooltip content="Suggest OCR Correction">
                                      <button
                                        onClick={() => setEditingSegment(`${doc.id}-en-${segIdx}`)}
                                        className="opacity-0 group-hover:opacity-100 absolute -right-6 top-0 text-[#00FF85] hover:text-[#00CC6A] transition-opacity"
                                      >
                                        <FaEdit className="text-xs" />
                                      </button>
                                    </NeonTooltip>
                                    {editingSegment === `${doc.id}-en-${segIdx}` && (
                                      <div className="mt-2 p-3 bg-[#1a1a1a] border border-[#00FF85]/30 rounded-lg">
                                        <textarea
                                          defaultValue={segment}
                                          onChange={(e) => setCorrectionText(e.target.value)}
                                          className="w-full bg-[#0a0a0a] text-white p-2 rounded text-sm mb-2"
                                          rows={3}
                                        />
                                        <div className="flex space-x-2">
                                          <button
                                            onClick={() => handleCorrectionSubmit(doc.id, segment, correctionText || segment)}
                                            className="px-3 py-1 bg-[#00FF85] text-gray-900 rounded text-xs font-semibold hover:bg-[#00CC6A]"
                                          >
                                            Submit Correction
                                          </button>
                                          <button
                                            onClick={() => {
                                              setEditingSegment(null);
                                              setCorrectionText('');
                                            }}
                                            className="px-3 py-1 bg-[#1a1a1a] border border-[#00FF85]/30 text-[#00FF85] rounded text-xs hover:bg-[#2a2a2a]"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : hasBilingual && currentMode === 'ES' ? (
                          <div className="space-y-2">
                            {getTextSegments(doc.content_es).map((segment, segIdx) => (
                              <div key={segIdx} className="group relative">
                                <span>{highlightTextAndLocations(segment, searchQuery, doc.locations)}</span>
                                <NeonTooltip content="Suggest OCR Correction">
                                  <button
                                    onClick={() => setEditingSegment(`${doc.id}-es-${segIdx}`)}
                                    className="opacity-0 group-hover:opacity-100 absolute -right-6 top-0 text-[#00FF85] hover:text-[#00CC6A] transition-opacity"
                                  >
                                    <FaEdit className="text-xs" />
                                  </button>
                                </NeonTooltip>
                                {editingSegment === `${doc.id}-es-${segIdx}` && (
                                  <div className="mt-2 p-3 bg-[#1a1a1a] border border-[#00FF85]/30 rounded-lg">
                                    <textarea
                                      defaultValue={segment}
                                      onChange={(e) => setCorrectionText(e.target.value)}
                                      className="w-full bg-[#0a0a0a] text-white p-2 rounded text-sm mb-2"
                                      rows={3}
                                    />
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => handleCorrectionSubmit(doc.id, segment, correctionText || segment)}
                                        className="px-3 py-1 bg-[#00FF85] text-gray-900 rounded text-xs font-semibold hover:bg-[#00CC6A]"
                                      >
                                        Submit Correction
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingSegment(null);
                                          setCorrectionText('');
                                        }}
                                        className="px-3 py-1 bg-[#1a1a1a] border border-[#00FF85]/30 text-[#00FF85] rounded text-xs hover:bg-[#2a2a2a]"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {getTextSegments(doc.content_en || doc.content).map((segment, segIdx) => (
                              <div key={segIdx} className="group relative">
                                <span>{highlightTextAndLocations(segment, searchQuery, doc.locations)}</span>
                                <NeonTooltip content="Suggest OCR Correction">
                                  <button
                                    onClick={() => setEditingSegment(`${doc.id}-en-${segIdx}`)}
                                    className="opacity-0 group-hover:opacity-100 absolute -right-6 top-0 text-[#00FF85] hover:text-[#00CC6A] transition-opacity"
                                  >
                                    <FaEdit className="text-xs" />
                                  </button>
                                </NeonTooltip>
                                {editingSegment === `${doc.id}-en-${segIdx}` && (
                                  <div className="mt-2 p-3 bg-[#1a1a1a] border border-[#00FF85]/30 rounded-lg">
                                    <textarea
                                      defaultValue={segment}
                                      onChange={(e) => setCorrectionText(e.target.value)}
                                      className="w-full bg-[#0a0a0a] text-white p-2 rounded text-sm mb-2"
                                      rows={3}
                                    />
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => handleCorrectionSubmit(doc.id, segment, correctionText || segment)}
                                        className="px-3 py-1 bg-[#00FF85] text-gray-900 rounded text-xs font-semibold hover:bg-[#00CC6A]"
                                      >
                                        Submit Correction
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingSegment(null);
                                          setCorrectionText('');
                                        }}
                                        className="px-3 py-1 bg-[#1a1a1a] border border-[#00FF85]/30 text-[#00FF85] rounded text-xs hover:bg-[#2a2a2a]"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Digital Humanities Provenance Footer */}
                      <div className="mt-4 pt-3 border-t border-[#00FF85]/10">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-white/70" style={{ fontFamily: 'Chakra Petch, monospace' }}>
                            Source: Digital Archive | Ingestion ID: {doc.id} | Metadata Confidence: {getConfidenceScore(doc.id)}%
                          </p>
                          {/* Version History Badge */}
                          <div className="relative group">
                            <div className="flex items-center space-x-1 px-2 py-1 bg-blue-900/20 border border-blue-500/30 rounded cursor-help">
                              <FaHistory className="text-blue-400 text-xs" />
                              <span className="text-xs text-blue-400 font-semibold" style={{ fontFamily: 'Chakra Petch, monospace' }}>
                                History
                              </span>
                            </div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-[#0a0a0a] border border-[#00FF85]/50 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                              <div className="text-white/90 font-semibold mb-1">Document Provenance</div>
                              <div className="text-[#00FF85] text-[11px]">Last modified by:</div>
                              <div className="text-blue-400 font-mono text-[11px]">Python Pipeline v2.1</div>
                              <div className="text-white/70 text-[11px] mt-1">on Jan 14, 2026</div>
                              <div className="mt-1 pt-1 border-t border-[#00FF85]/20 text-white/50 text-[10px]">
                                Version: 2.1.0 | Build: #1234
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              }
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Right Column: Analytical Tools */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-3 space-y-6"
          >
            {/* DATA HEALTH SECTION - Tactical Integrity & QC Suite */}
            {showDataHealth && (
              <>
                {/* 1. Transcript Confidence Grid (Heatmap) */}
                <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#00FF85]/20 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <FaShieldAlt className="text-[#00FF85] text-xl" />
                      <h2 className="text-xl font-heading font-semibold">Transcript Confidence</h2>
                    </div>
                  </div>
                  <p className="text-sm text-white/60 mb-4">
                    OCR Quality Control: 20 Archive Documents
                  </p>
                  
                  {/* Confidence Legend */}
                  <div className="flex items-center justify-between mb-4 text-xs" style={{ fontFamily: 'Chakra Petch, monospace' }}>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-white/70">&gt;95%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span className="text-white/70">90-95%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-white/70">&lt;90%</span>
                    </div>
                  </div>

                  {/* Heatmap Grid (5x4 grid for 20 documents) */}
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {archiveData.map((doc) => {
                      const score = getConfidenceScore(doc.id);
                      const { bg, border } = getConfidenceColor(score);
                      return (
                        <div
                          key={doc.id}
                          className={`relative aspect-square ${bg} ${border} border-2 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform group`}
                          title={`Doc ${doc.id}: ${score}% confidence`}
                        >
                          <span className="text-xs font-bold text-white" style={{ fontFamily: 'Chakra Petch, monospace' }}>
                            {doc.id}
                          </span>
                          <span className="text-[10px] text-white/90 font-semibold">
                            {score}%
                          </span>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[#0a0a0a] border border-[#00FF85]/50 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <div className="text-white font-semibold">Doc {doc.id}: {doc.speaker}</div>
                            <div className="text-[#00FF85]">Confidence: {score}%</div>
                            <div className="text-white/70">{getConfidenceColor(score).label}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-3 text-center text-xs" style={{ fontFamily: 'Chakra Petch, monospace' }}>
                    <div className="bg-green-900/20 border border-green-500/30 rounded p-2">
                      <div className="text-green-400 font-bold text-lg">
                        {archiveData.filter(d => getConfidenceScore(d.id) >= 95).length}
                      </div>
                      <div className="text-white/60">High</div>
                    </div>
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-2">
                      <div className="text-yellow-400 font-bold text-lg">
                        {archiveData.filter(d => {
                          const s = getConfidenceScore(d.id);
                          return s >= 90 && s < 95;
                        }).length}
                      </div>
                      <div className="text-white/60">Review</div>
                    </div>
                    <div className="bg-red-900/20 border border-red-500/30 rounded p-2">
                      <div className="text-red-400 font-bold text-lg">
                        {archiveData.filter(d => getConfidenceScore(d.id) < 90).length}
                      </div>
                      <div className="text-white/60">Critical</div>
                    </div>
                  </div>
                </div>

                {/* 2. Schema Validator Dashboard */}
                <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#00FF85]/20 rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <FaClipboardCheck className="text-[#00FF85] text-xl" />
                    <h2 className="text-xl font-heading font-semibold">Schema Validator</h2>
                  </div>
                  <p className="text-sm text-white/60 mb-4">
                    Metadata Completeness for Current View ({filteredDocuments.length} docs)
                  </p>
                  
                  {(() => {
                    const metrics = getSchemaMetrics();
                    return (
                      <div className="space-y-3">
                        {/* Speaker ID Linked */}
                        <div className="bg-[#0a0a0a]/60 border border-[#00FF85]/10 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <FaCheckCircle className="text-green-400 text-sm" />
                              <span className="text-sm text-white/90 font-semibold">Speaker ID Linked</span>
                            </div>
                            <span className="text-xs px-2 py-1 bg-green-900/30 border border-green-500/50 text-green-400 rounded font-mono">
                              {metrics.speakerIdLinked}% OK
                            </span>
                          </div>
                          <div className="w-full bg-[#1a1a1a] rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${metrics.speakerIdLinked}%` }}
                            />
                          </div>
                        </div>

                        {/* Coordinates Assigned */}
                        <div className="bg-[#0a0a0a]/60 border border-[#00FF85]/10 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {metrics.coordinatesAssigned >= 95 ? (
                                <FaCheckCircle className="text-green-400 text-sm" />
                              ) : (
                                <FaExclamationTriangle className="text-yellow-400 text-sm" />
                              )}
                              <span className="text-sm text-white/90 font-semibold">Coordinates Assigned</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded font-mono ${
                              metrics.coordinatesAssigned >= 95 
                                ? 'bg-green-900/30 border border-green-500/50 text-green-400'
                                : 'bg-yellow-900/30 border border-yellow-500/50 text-yellow-400'
                            }`}>
                              {metrics.coordinatesAssigned}% OK
                            </span>
                          </div>
                          <div className="w-full bg-[#1a1a1a] rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                metrics.coordinatesAssigned >= 95 ? 'bg-green-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${metrics.coordinatesAssigned}%` }}
                            />
                          </div>
                        </div>

                        {/* ISO-8601 Date Format */}
                        <div className="bg-[#0a0a0a]/60 border border-[#00FF85]/10 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <FaCheckCircle className="text-green-400 text-sm" />
                              <span className="text-sm text-white/90 font-semibold">ISO-8601 Date Format</span>
                            </div>
                            <span className="text-xs px-2 py-1 bg-green-900/30 border border-green-500/50 text-green-400 rounded font-mono">
                              {metrics.isoDateFormat}% OK
                            </span>
                          </div>
                          <div className="w-full bg-[#1a1a1a] rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${metrics.isoDateFormat}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="mt-4 pt-3 border-t border-[#00FF85]/10">
                    <p className="text-xs text-white/50 italic" style={{ fontFamily: 'Chakra Petch, monospace' }}>
                      ✓ Database normalization & metadata standards compliant
                    </p>
                  </div>
                </div>

                {/* 3. Export for Peer Review */}
                <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#00FF85]/20 rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <FaDownload className="text-[#00FF85] text-xl" />
                    <h2 className="text-xl font-heading font-semibold">Academic Export</h2>
                  </div>
                  <p className="text-sm text-white/60 mb-4">
                    Export datasets for independent verification
                  </p>
                  
                  <button
                    onClick={handleExportJSONL}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-[#00FF85]/10 hover:bg-[#00FF85]/20 border border-[#00FF85]/30 rounded-lg text-[#00FF85] transition-all group"
                    title="Exports raw text + metadata + AI annotations for independent verification"
                  >
                    <FaFileAlt className="text-lg group-hover:scale-110 transition-transform" />
                    <span className="font-semibold">Export Annotated Dataset (.JSONL)</span>
                  </button>

                  <div className="mt-3 p-3 bg-[#0a0a0a]/60 border border-[#00FF85]/10 rounded-lg">
                    <p className="text-xs text-white/70 leading-relaxed" style={{ fontFamily: 'Chakra Petch, monospace' }}>
                      <strong className="text-[#00FF85]">📋 Includes:</strong><br/>
                      • Raw text + metadata<br/>
                      • AI annotations<br/>
                      • Confidence scores<br/>
                      • Geospatial coordinates<br/>
                      • Pipeline provenance<br/>
                      <br/>
                      <strong className="text-[#00FF85]">🎓 Academic Reproducibility:</strong><br/>
                      JSONL format enables peer review and independent verification of findings.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Frequency Chart with Toggle */}
            <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#00FF85]/20 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <FaChartBar className="text-[#00FF85] text-xl" />
                  <h2 className="text-xl font-heading font-semibold">
                    {chartType === 'word' ? 'Word Frequency' : 'Entity Frequency'}
                  </h2>
                </div>
                <div className="flex items-center space-x-2 bg-[#0a0a0a] rounded-lg p-1">
                  <button
                    onClick={() => setChartType('word')}
                    className={`px-3 py-1 text-xs rounded transition-all ${
                      chartType === 'word'
                        ? 'bg-[#00FF85] text-gray-900 font-semibold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Words
                  </button>
                  <button
                    onClick={() => setChartType('entity')}
                    className={`px-3 py-1 text-xs rounded transition-all ${
                      chartType === 'entity'
                        ? 'bg-[#00FF85] text-gray-900 font-semibold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Entities
                  </button>
                </div>
              </div>
              <p className="text-sm text-white/60 mb-4">
                Top 5 {chartType === 'word' ? 'words' : 'entities'} in filtered view
              </p>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData} layout="vertical">
                    <XAxis type="number" stroke="#00FF85" strokeWidth={1} />
                    <YAxis 
                      type="category" 
                      dataKey="word" 
                      stroke="#00FF85" 
                      strokeWidth={1}
                      width={80}
                      tick={{ fill: '#ffffff', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #00FF85',
                        borderRadius: '8px',
                        color: '#ffffff',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#00FF85" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-white/40 py-8">
                  No data available
                </div>
              )}
              {/* Export CSV Button */}
              <NeonTooltip content="Export Data for Peer Review">
                <button
                  onClick={handleExportCSV}
                  className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-2 bg-[#00FF85]/10 hover:bg-[#00FF85]/20 border border-[#00FF85]/30 rounded-lg text-[#00FF85] transition-all"
                >
                  <FaDownload className="text-sm" />
                  <span className="text-sm">Download CSV</span>
                </button>
              </NeonTooltip>
            </div>

            {/* Timeline Heatmap */}
            <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#00FF85]/20 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <FaCalendarAlt className="text-[#00FF85] text-xl" />
                <h2 className="text-xl font-heading font-semibold">Timeline</h2>
              </div>
              <p className="text-sm text-white/60 mb-4">Document density over time</p>
              {timelineData.length > 0 ? (
                <div className="space-y-3">
                  {timelineData.map((item) => {
                    const maxCount = Math.max(...timelineData.map(d => d.count));
                    const intensity = item.count / maxCount;
                    return (
                      <div key={item.month} className="flex items-center space-x-3">
                        <span className="text-xs text-white/60 w-20">{item.month}</span>
                        <div className="flex-1 bg-[#0a0a0a] rounded-full h-6 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#00FF85]/20 to-[#00FF85] transition-all"
                            style={{ width: `${intensity * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-[#00FF85] w-8 text-right">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-white/40 py-8">
                  No data available
                </div>
              )}
            </div>

            {/* Search Results Preview */}
            {searchResults.length > 0 && (
              <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#00FF85]/20 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <FaSearch className="text-[#00FF85] text-xl" />
                  <h2 className="text-xl font-heading font-semibold">Search Results</h2>
                  <span className="text-sm text-[#00FF85]">({searchResults.length})</span>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {searchResults.slice(0, 10).map((result, index) => (
                    <div
                      key={index}
                      className="bg-[#0a0a0a]/60 border border-[#00FF85]/10 rounded-lg p-3 text-sm"
                    >
                      <div className="text-[#00FF85] font-semibold mb-1">
                        {result.doc.speaker} - {result.doc.date}
                      </div>
                      <div className="text-white/80">
                        <span className="text-white/50">...</span>
                        {highlightTextAndLocations(result.snippet, searchQuery, result.doc.locations)}
                        <span className="text-white/50">...</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* N-Gram Trend Analyzer */}
            <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#00FF85]/20 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <FaChartBar className="text-[#00FF85] text-xl" />
                <h2 className="text-xl font-heading font-semibold">Tactical N-Gram Tracker</h2>
              </div>
              <p className="text-sm text-white/60 mb-4">
                Search tactical term frequency over time (e.g., VAR, Pressing)
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  value={ngramQuery}
                  onChange={(e) => setNgramQuery(e.target.value)}
                  placeholder="Enter tactical term (e.g., VAR, Pressing)..."
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#00FF85]/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00FF85] focus:border-[#00FF85] transition-all text-sm"
                />
                {ngramData.length > 0 ? (
                  <div>
                    <div className="text-xs text-white/60 mb-2" style={{ fontFamily: 'Chakra Petch, monospace' }}>
                      Frequency Timeline
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={ngramData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#00FF85" opacity={0.2} />
                        <XAxis 
                          dataKey="month" 
                          stroke="#00FF85" 
                          strokeWidth={1}
                          tick={{ fill: '#ffffff', fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          stroke="#00FF85" 
                          strokeWidth={1}
                          tick={{ fill: '#ffffff', fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1a1a1a',
                            border: '1px solid #00FF85',
                            borderRadius: '8px',
                            color: '#ffffff',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="frequency" 
                          stroke="#00FF85" 
                          strokeWidth={2}
                          dot={{ fill: '#00FF85', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : ngramQuery.trim() ? (
                  <div className="text-center text-white/40 py-8">
                    No occurrences found for "{ngramQuery}"
                  </div>
                ) : (
                  <div className="text-center text-white/40 py-8">
                    Enter a term to track its frequency over time
                  </div>
                )}
              </div>
            </div>

            {/* AI Query Input */}
            <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#00FF85]/20 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <FaRobot className="text-[#00FF85] text-xl" />
                <h2 className="text-xl font-heading font-semibold">Ask the Corpus (AI)</h2>
              </div>
              <form onSubmit={handleAiQuery} className="space-y-3">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Ask a question about 16th-century patterns..."
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#00FF85]/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00FF85] focus:border-[#00FF85] transition-all text-sm"
                />
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-[#00FF85]/10 hover:bg-[#00FF85]/20 border border-[#00FF85]/30 rounded-lg text-[#00FF85] transition-all text-sm font-medium"
                >
                  Query
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Corpus Settings Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isProcessing && setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a1a1a] border border-[#00FF85]/30 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-heading font-bold text-white">Corpus Settings</h2>
                <button
                  onClick={() => !isProcessing && setIsModalOpen(false)}
                  className="text-white/60 hover:text-white transition-colors"
                  disabled={isProcessing}
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              {/* Batch Processing Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Batch Processing</h3>
                <div className="bg-[#0a0a0a]/60 border border-[#00FF85]/10 rounded-lg p-4 mb-4">
                  <div className="space-y-2">
                    {pendingFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 text-white/80 text-sm"
                      >
                        {file.endsWith('.pdf') ? (
                          <FaFilePdf className="text-red-400" />
                        ) : (
                          <FaFileAlt className="text-blue-400" />
                        )}
                        <span>{file}</span>
                        <span className="ml-auto text-[#00FF85]/60 text-xs">Pending</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pipeline Status */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Pipeline Status</h3>
                <div className="space-y-3">
                  {pipelineSteps.map((step, index) => (
                    <div
                      key={index}
                      className={`flex items-center space-x-3 p-3 rounded-lg border ${
                        currentPipelineStep === step
                          ? 'bg-[#00FF85]/10 border-[#00FF85]/50'
                          : 'bg-[#0a0a0a]/60 border-[#00FF85]/10'
                      }`}
                    >
                      {isProcessing && currentPipelineStep === step ? (
                        <FaSpinner className="text-[#00FF85] animate-spin" />
                      ) : processingProgress > (index + 1) * 20 ? (
                        <FaCheck className="text-[#00FF85]" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-white/20" />
                      )}
                      <span className={`text-sm ${
                        currentPipelineStep === step
                          ? 'text-[#00FF85] font-semibold'
                          : processingProgress > (index + 1) * 20
                          ? 'text-white/60'
                          : 'text-white/40'
                      }`}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Progress Bar */}
                {isProcessing && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/60">Processing...</span>
                      <span className="text-sm text-[#00FF85]">{processingProgress}%</span>
                    </div>
                    <div className="w-full bg-[#0a0a0a] rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${processingProgress}%` }}
                        className="h-full bg-gradient-to-r from-[#00FF85] to-[#00CC6A]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Process Button */}
              <button
                onClick={handleProcessFiles}
                disabled={isProcessing}
                className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
                  isProcessing
                    ? 'bg-[#00FF85]/20 text-[#00FF85]/60 cursor-not-allowed'
                    : 'bg-[#00FF85] text-gray-900 hover:bg-[#00CC6A]'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Process New Files'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Methodology Modal */}
      <AnimatePresence>
        {isMethodologyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsMethodologyModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              style={{ fontFamily: 'Chakra Petch, monospace' }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#3c3c3c] bg-[#252526]">
                <div className="flex items-center space-x-3">
                  <FaCode className="text-[#4EC9B0] text-xl" />
                  <h2 className="text-xl font-semibold text-white">Pipeline Inspector</h2>
                </div>
                <button
                  onClick={() => setIsMethodologyModalOpen(false)}
                  className="text-[#858585] hover:text-white transition-colors p-1"
                >
                  <FaTimes className="text-lg" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#3c3c3c] bg-[#2d2d30]">
                <button
                  onClick={() => setActiveTab('raw')}
                  className={`px-6 py-3 text-sm font-medium transition-all ${
                    activeTab === 'raw'
                      ? 'text-white bg-[#1e1e1e] border-b-2 border-[#007ACC]'
                      : 'text-[#858585] hover:text-white hover:bg-[#1e1e1e]/50'
                  }`}
                >
                  Raw Ingestion
                </button>
                <button
                  onClick={() => setActiveTab('python')}
                  className={`px-6 py-3 text-sm font-medium transition-all ${
                    activeTab === 'python'
                      ? 'text-white bg-[#1e1e1e] border-b-2 border-[#007ACC]'
                      : 'text-[#858585] hover:text-white hover:bg-[#1e1e1e]/50'
                  }`}
                >
                  Python Transformation
                </button>
                <button
                  onClick={() => setActiveTab('output')}
                  className={`px-6 py-3 text-sm font-medium transition-all ${
                    activeTab === 'output'
                      ? 'text-white bg-[#1e1e1e] border-b-2 border-[#007ACC]'
                      : 'text-[#858585] hover:text-white hover:bg-[#1e1e1e]/50'
                  }`}
                >
                  Structured Output
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#1e1e1e]">
                {/* Tab 1: Raw Ingestion */}
                {activeTab === 'raw' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white mb-2">OCR/PDF Raw Output</h3>
                      <p className="text-sm text-[#858585] mb-4">
                        Unprocessed text extracted from historical documents via OCR scanning.
                      </p>
                    </div>
                    <div className="bg-[#0d0d0d] border border-[#3c3c3c] rounded p-4">
                      <div className="text-[#CE9178] text-sm leading-relaxed whitespace-pre-wrap">
                        <span className="text-[#858585]">[OCR Output - Document 1540]</span>{'\n'}
                        {'\n'}
                        Inqui$ition..  PROcess_1540... [illegible]{'\n'}
                        {'\n'}
                        <span className="text-[#858585]">[Metadata Fragment]</span>{'\n'}
                        Date: [unclear] 15??{'\n'}
                        Speaker: [partial] "Guard..."{'\n'}
                        {'\n'}
                        <span className="text-[#858585]">[Main Text - Low Confidence OCR]</span>{'\n'}
                        We c0ntr0lled the game... The p0ssessi0n was g00d,{'\n'}
                        but the transiti0n defense needs w0rk...{'\n'}
                        {'\n'}
                        VAR decisi0ns t0day were c0ntr0versial...{'\n'}
                        {'\n'}
                        [illegible section - 3 lines]{'\n'}
                        {'\n'}
                        The title race is l0ng, and every p0int matters.{'\n'}
                        {'\n'}
                        <span className="text-[#858585]">[End of OCR Output]</span>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-[#3c3c3c]/30 rounded border border-[#3c3c3c]">
                      <p className="text-xs text-[#858585]">
                        <span className="text-[#4EC9B0]">Note:</span> Raw OCR output contains artifacts, 
                        character recognition errors (0/O, $/S), and missing sections requiring 
                        manual review and automated cleaning.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Tab 2: Python Transformation */}
                {activeTab === 'python' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white mb-2">Data Cleaning Pipeline</h3>
                      <p className="text-sm text-[#858585] mb-4">
                        Production Python script for cleaning and normalizing OCR-extracted text.
                      </p>
                    </div>
                    <div className="bg-[#0d0d0d] border border-[#3c3c3c] rounded overflow-hidden">
                      <div className="bg-[#252526] px-4 py-2 border-b border-[#3c3c3c] flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                        <span className="ml-4 text-xs text-[#858585]">clean_inquisition_text.py</span>
                      </div>
                      <div className="p-4 overflow-x-auto">
                        <pre className="text-sm leading-relaxed">
                          <code>
                            <span className="text-[#569CD6]">import</span> <span className="text-[#CE9178]">pandas</span> <span className="text-[#569CD6]">as</span> <span className="text-[#CE9178]">pd</span>{'\n'}
                            <span className="text-[#569CD6]">import</span> <span className="text-[#CE9178]">re</span>{'\n'}
                            <span className="text-[#569CD6]">from</span> <span className="text-[#CE9178]">datetime</span> <span className="text-[#569CD6]">import</span> <span className="text-[#CE9178]">datetime</span>{'\n'}
                            <span className="text-[#569CD6]">from</span> <span className="text-[#CE9178]">typing</span> <span className="text-[#569CD6]">import</span> <span className="text-[#CE9178]">Dict</span>, <span className="text-[#CE9178]">Optional</span>{'\n'}
                            {'\n'}
                            <span className="text-[#569CD6]">def</span> <span className="text-[#DCDCAA]">clean_inquisition_text</span>(<span className="text-[#9CDCFE]">text</span>: <span className="text-[#4EC9B0]">str</span>) -&gt; <span className="text-[#4EC9B0]">Dict</span>:{'\n'}
                            <span className="text-[#6A9955]">    """</span>{'\n'}
                            <span className="text-[#6A9955]">    Clean and normalize OCR-extracted historical text.</span>{'\n'}
                            <span className="text-[#6A9955]">    Returns structured metadata and cleaned content.</span>{'\n'}
                            <span className="text-[#6A9955]">    """</span>{'\n'}
                            {'\n'}
                            <span className="text-[#6A9955]">    # Normalize common OCR errors</span>{'\n'}
                            <span className="text-[#9CDCFE]">text</span> = <span className="text-[#DCDCAA]">re</span>.<span className="text-[#DCDCAA]">sub</span>(<span className="text-[#CE9178]">r'0'</span>, <span className="text-[#CE9178]">'o'</span>, <span className="text-[#9CDCFE]">text</span>)  <span className="text-[#6A9955]"># 0 -&gt; o</span>{'\n'}
                            <span className="text-[#9CDCFE]">text</span> = <span className="text-[#DCDCAA]">re</span>.<span className="text-[#DCDCAA]">sub</span>(<span className="text-[#CE9178]">r'\$'</span>, <span className="text-[#CE9178]">'s'</span>, <span className="text-[#9CDCFE]">text</span>)  <span className="text-[#6A9955]"># $ -&gt; s</span>{'\n'}
                            <span className="text-[#9CDCFE]">text</span> = <span className="text-[#DCDCAA]">re</span>.<span className="text-[#DCDCAA]">sub</span>(<span className="text-[#CE9178]">r'\.{'{'}2,{'}'}'</span>, <span className="text-[#CE9178]">'...'</span>, <span className="text-[#9CDCFE]">text</span>)  <span className="text-[#6A9955]"># Normalize ellipses</span>{'\n'}
                            {'\n'}
                            <span className="text-[#6A9955]">    # Remove illegible markers</span>{'\n'}
                            <span className="text-[#9CDCFE]">text</span> = <span className="text-[#DCDCAA]">re</span>.<span className="text-[#DCDCAA]">sub</span>(<span className="text-[#CE9178]">r'\[illegible[^\]]*\]'</span>, <span className="text-[#CE9178]">''</span>, <span className="text-[#9CDCFE]">text</span>, <span className="text-[#9CDCFE]">flags</span>=<span className="text-[#DCDCAA]">re</span>.<span className="text-[#DCDCAA]">IGNORECASE</span>){'\n'}
                            {'\n'}
                            <span className="text-[#6A9955]">    # Extract metadata patterns</span>{'\n'}
                            <span className="text-[#9CDCFE]">date_match</span> = <span className="text-[#DCDCAA]">re</span>.<span className="text-[#DCDCAA]">search</span>(<span className="text-[#CE9178]">r'(\d{4}-\d{2}-\d{2})|(\d{4})'</span>, <span className="text-[#9CDCFE]">text</span>){'\n'}
                            <span className="text-[#9CDCFE]">speaker_match</span> = <span className="text-[#DCDCAA]">re</span>.<span className="text-[#DCDCAA]">search</span>(<span className="text-[#CE9178]">r'Speaker:\s*"([^"]+)"'</span>, <span className="text-[#9CDCFE]">text</span>){'\n'}
                            {'\n'}
                            <span className="text-[#6A9955]">    # Normalize whitespace</span>{'\n'}
                            <span className="text-[#9CDCFE]">text</span> = <span className="text-[#DCDCAA]">re</span>.<span className="text-[#DCDCAA]">sub</span>(<span className="text-[#CE9178]">r'\s+'</span>, <span className="text-[#CE9178]">' '</span>, <span className="text-[#9CDCFE]">text</span>){'\n'}
                            <span className="text-[#9CDCFE]">text</span> = <span className="text-[#9CDCFE]">text</span>.<span className="text-[#DCDCAA]">strip</span>(){'\n'}
                            {'\n'}
                            <span className="text-[#569CD6]">    return</span> {'{'}{'\n'}
                            <span className="text-[#CE9178]">        'cleaned_text'</span>: <span className="text-[#9CDCFE]">text</span>,{'\n'}
                            <span className="text-[#CE9178]">        'date'</span>: <span className="text-[#9CDCFE]">date_match</span>.<span className="text-[#DCDCAA]">group</span>(<span className="text-[#B5CEA8]">0</span>) <span className="text-[#569CD6]">if</span> <span className="text-[#9CDCFE]">date_match</span> <span className="text-[#569CD6]">else</span> <span className="text-[#569CD6]">None</span>,{'\n'}
                            <span className="text-[#CE9178]">        'speaker'</span>: <span className="text-[#9CDCFE]">speaker_match</span>.<span className="text-[#DCDCAA]">group</span>(<span className="text-[#B5CEA8]">1</span>) <span className="text-[#569CD6]">if</span> <span className="text-[#9CDCFE]">speaker_match</span> <span className="text-[#569CD6]">else</span> <span className="text-[#569CD6]">None</span>,{'\n'}
                            <span className="text-[#CE9178]">        'processed_at'</span>: <span className="text-[#DCDCAA]">datetime</span>.<span className="text-[#DCDCAA]">now</span>().<span className="text-[#DCDCAA]">isoformat</span>(){'\n'}
                            {'    }'}{'\n'}
                            {'\n'}
                            <span className="text-[#6A9955]"># Batch processing with pandas</span>{'\n'}
                            <span className="text-[#9CDCFE]">df</span> = <span className="text-[#DCDCAA]">pd</span>.<span className="text-[#DCDCAA]">read_csv</span>(<span className="text-[#CE9178]">'raw_ocr_outputs.csv'</span>){'\n'}
                            <span className="text-[#9CDCFE]">df</span>[<span className="text-[#CE9178]">'cleaned'</span>] = <span className="text-[#9CDCFE]">df</span>[<span className="text-[#CE9178]">'raw_text'</span>].<span className="text-[#DCDCAA]">apply</span>(<span className="text-[#DCDCAA]">clean_inquisition_text</span>){'\n'}
                            <span className="text-[#9CDCFE]">df</span>.<span className="text-[#DCDCAA]">to_json</span>(<span className="text-[#CE9178]">'cleaned_corpus.json'</span>, <span className="text-[#9CDCFE]">orient</span>=<span className="text-[#CE9178]">'records'</span>, <span className="text-[#9CDCFE]">indent</span>=<span className="text-[#B5CEA8]">2</span>)
                          </code>
                        </pre>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-[#3c3c3c]/30 rounded border border-[#3c3c3c]">
                      <p className="text-xs text-[#858585]">
                        <span className="text-[#4EC9B0]">Production Script:</span> Handles OCR artifacts, 
                        extracts metadata via regex patterns, normalizes text, and outputs structured JSON 
                        for downstream analysis. Uses pandas for batch processing.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Tab 3: Structured Output */}
                {activeTab === 'output' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white mb-2">Cleaned & Structured Data</h3>
                      <p className="text-sm text-[#858585] mb-4">
                        Final output ready for ingestion into the archive system.
                      </p>
                    </div>
                    <div className="bg-[#0d0d0d] border border-[#3c3c3c] rounded p-4 overflow-x-auto">
                      <pre className="text-sm text-[#D4D4D4] leading-relaxed">
                        <code>
{`{
  "id": 1,
  "date": "2023-08-12",
  "speaker": "Pep Guardiola",
  "tags": ["Tactics", "Post-Match", "Possession"],
  "content": "We controlled the game. The possession was good, but the transition defense needs work. VAR decisions today were controversial, but we must focus on what we can control. The title race is long, and every point matters.",
  "metadata": {
    "processed_at": "2024-01-15T10:30:00Z",
    "source": "OCR_1540",
    "confidence_score": 0.87,
    "cleaning_applied": [
      "ocr_error_correction",
      "whitespace_normalization",
      "metadata_extraction"
    ]
  },
  "entities": {
    "people": ["Pep Guardiola"],
    "topics": ["VAR", "Possession", "Tactics"],
    "dates": ["2023-08-12"]
  }
}`}
                        </code>
                      </pre>
                    </div>
                    <div className="mt-4 p-3 bg-[#3c3c3c]/30 rounded border border-[#3c3c3c]">
                      <p className="text-xs text-[#858585]">
                        <span className="text-[#4EC9B0]">Structured Format:</span> Clean JSON with normalized 
                        text, extracted metadata, entity tags, and processing provenance. Ready for search 
                        indexing and analytical queries.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Digital Humanities Exports Section */}
              <div className="border-t border-[#3c3c3c] bg-[#252526] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">Digital Humanities Exports</h3>
                    <p className="text-xs text-[#858585]">
                      Export relationship data for network visualization of entities.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Generate mock Gephi-compatible CSV
                      const gephiData = `source,target,weight,type
Pep Guardiola,VAR,3,mentions
Pep Guardiola,Possession,5,mentions
Pep Guardiola,Tactics,4,mentions
Jurgen Klopp,Injury,3,mentions
Jurgen Klopp,Tactics,4,mentions
Mikel Arteta,VAR,4,mentions
Mikel Arteta,Controversy,3,mentions`;
                      const blob = new Blob([gephiData], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      const url = URL.createObjectURL(blob);
                      link.setAttribute('href', url);
                      link.setAttribute('download', `entity_network_gephi_${new Date().toISOString().split('T')[0]}.csv`);
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-[#007ACC] hover:bg-[#005a9e] text-white rounded transition-all text-sm font-medium"
                  >
                    <FaDownload className="text-sm" />
                    <span>Download Node-Edge List (Gephi)</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spatial Analysis Map Tab */}
<AnimatePresence>
  {showSpatialTab && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={() => setShowSpatialTab(false)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1a1a] border border-[#00FF85]/30 rounded-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FaMap className="text-[#00FF85] text-2xl" />
            <h2 className="text-2xl font-heading font-bold text-white">Spatial Analysis</h2>
          </div>
          <button
            onClick={() => setShowSpatialTab(false)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>
        
        {/* Geospatial Intelligence Dashboard */}
        <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
          {/* Left Column: Location Filters */}
          <div className="bg-[#0a0a0a]/60 border border-[#00FF85]/10 rounded-lg p-6 overflow-y-auto">
            <div className="flex items-center space-x-2 mb-4">
              <FaMapMarkerAlt className="text-[#00FF85] text-xl" />
              <h3 className="text-lg font-heading font-semibold text-white">Site Analytics</h3>
            </div>
            <p className="text-xs text-white/60 mb-4" style={{ fontFamily: 'Chakra Petch, monospace' }}>
              Click to filter documents by location
            </p>
            <div className="space-y-2">
              {uniqueLocations.map(location => {
                const docCount = archiveData.filter(doc => 
                  doc.locations && doc.locations.includes(location)
                ).length;
                const isSelected = selectedLocations.includes(location);
                
                return (
                  <button
                    key={location}
                    onClick={() => handleLocationClick(location)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-[#00FF85]/20 border-[#00FF85] text-[#00FF85]'
                        : 'bg-[#1a1a1a] border-[#00FF85]/20 text-white/70 hover:border-[#00FF85]/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{location}</span>
                      <span className="text-xs px-2 py-1 bg-[#00FF85]/10 rounded" style={{ fontFamily: 'Chakra Petch, monospace' }}>
                        {docCount} doc{docCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Document Density Chart */}
          <div className="bg-[#0a0a0a]/60 border border-[#00FF85]/10 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <FaChartBar className="text-[#00FF85] text-xl" />
              <h3 className="text-lg font-heading font-semibold text-white">Document Density</h3>
            </div>
            <p className="text-xs text-white/60 mb-4" style={{ fontFamily: 'Chakra Petch, monospace' }}>
              Geographic distribution of archive corpus
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={uniqueLocations.map(location => ({
                  location: location.length > 15 ? location.substring(0, 12) + '...' : location,
                  count: archiveData.filter(doc => 
                    doc.locations && doc.locations.includes(location)
                  ).length
                })).sort((a, b) => b.count - a.count).slice(0, 10)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#00FF85" opacity={0.1} />
                <XAxis type="number" stroke="#00FF85" />
                <YAxis 
                  type="category" 
                  dataKey="location" 
                  stroke="#00FF85"
                  tick={{ fill: '#ffffff', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #00FF85',
                    borderRadius: '8px',
                    color: '#ffffff',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {uniqueLocations.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#00FF85" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-4 text-sm text-white/70" style={{ fontFamily: 'Chakra Petch, monospace' }}>
          <p>📍 Geospatial Intelligence Dashboard • {uniqueLocations.length} locations tracked across {archiveData.length} documents</p>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

      {/* RAG AI Chat Panel */}
      <AnimatePresence>
        {showAIChat && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            className="fixed bottom-6 right-6 w-96 bg-[#1a1a1a] border border-[#00FF85]/30 rounded-lg shadow-2xl z-50 flex flex-col"
            style={{ maxHeight: '600px', height: '600px' }}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#00FF85]/20">
              <div className="flex items-center space-x-2">
                <FaRobot className="text-[#00FF85] text-xl" />
                <h3 className="text-lg font-heading font-semibold text-white">Archive AI</h3>
              </div>
              <button
                onClick={() => setShowAIChat(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <FaTimes className="text-sm" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {ragMessages.length === 0 ? (
                <div className="text-center text-white/70 text-sm py-8">
                  <FaCommentDots className="text-3xl mb-3 mx-auto opacity-60" />
                  <p>Ask questions about the archive documents.</p>
                  <p className="text-xs mt-2 text-white/60">Context from {filteredDocuments.length} filtered document{filteredDocuments.length !== 1 ? 's' : ''} will be included.</p>
                </div>
              ) : (
                ragMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-[#00FF85] text-gray-900'
                          : 'bg-[#0a0a0a] border border-[#00FF85]/20 text-white'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                          <p className="text-xs font-semibold mb-1">Sources:</p>
                          <div className="flex flex-wrap gap-1">
                            {msg.sources.map((source, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => {
                                  const doc = archiveData.find(d => d.id === source.docId);
                                  if (doc) {
                                    const docElement = document.getElementById(`doc-${doc.id}`);
                                    if (docElement) {
                                      docElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      docElement.classList.add('ring-2', 'ring-[#00FF85]', 'transition-all', 'duration-1000');
                                      setTimeout(() => {
                                        docElement.classList.remove('ring-2', 'ring-[#00FF85]');
                                      }, 3000);
                                    }
                                  }
                                }}
                                className="px-2 py-0.5 bg-[#00FF85]/20 text-[#00FF85] rounded text-xs hover:bg-[#00FF85]/30 transition-colors cursor-pointer"
                                style={{ fontFamily: 'Chakra Petch, monospace' }}
                              >
                                [Doc #{source.docId}, {source.date || '2023'}]
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {ragLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#0a0a0a] border border-[#00FF85]/20 rounded-lg p-3 flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-3 h-3 bg-[#00FF85] rounded-full animate-pulse"></div>
                      <div className="w-3 h-3 bg-[#00FF85] rounded-full absolute top-0 left-0 animate-ping"></div>
                    </div>
                    <span className="text-sm text-white/70" style={{ fontFamily: 'Chakra Petch, monospace' }}>
                      Thinking...
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleRAGQuery} className="p-4 border-t border-[#00FF85]/20">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={ragInput}
                  onChange={(e) => setRagInput(e.target.value)}
                  placeholder="Ask about the archive..."
                  className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[#00FF85]/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00FF85] focus:border-[#00FF85] transition-all text-sm"
                  disabled={ragLoading}
                />
                <button
                  type="submit"
                  disabled={ragLoading || !ragInput.trim()}
                  className="px-4 py-2 bg-[#00FF85] text-gray-900 rounded-lg hover:bg-[#00CC6A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaPaperPlane />
                </button>
              </div>
              <p className="text-xs text-white/60 mt-2" style={{ fontFamily: 'Chakra Petch, monospace' }}>
                AI responses are synthesized from the currently filtered corpus.
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-6 bg-[#1a1a1a] border border-[#00FF85]/30 rounded-lg p-4 shadow-xl z-50 max-w-md"
          >
            <div className="flex items-start space-x-3">
              <FaCheckCircle className="text-[#00FF85] text-xl mt-0.5" />
              <div>
                <p className="text-white font-semibold mb-1">OCR Correction Submitted</p>
                <p className="text-white/80 text-sm">
                  Your correction has been recorded and will be reviewed.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Archive;
