export interface SegmentAnalysis {
  factDensity: number;       // 0 to 100
  fluffDensity: number;      // 0 to 100
  errorDensity: number;      // 0 to 100
  harmDensity: number;       // 0 to 100
  complexityScore: number;   // 0 to 100 (vocabulary, concept density)
  keyArguments: string[];    // Main ideas presented
  vagueOrNeedsBetterAssessment: string; // Ideas presented vaguely that need better assessment
  philosophicalPosition: string; // Implied school of thought (e.g., Stoic, Utilitarian, Nihilist)
}

export interface DebateSegment {
  id: string;
  speakerId: string;
  speakerLabel: string; // "Person A", "Person B", etc.
  text: string;
  timestamp: number;
  analysis?: SegmentAnalysis;
  analyzing?: boolean;
}

export interface SpeakerProfile {
  id: string;
  label: string; // Customizable e.g., "Person A", or "Socrates"
  avatarColor: string;
  wordCount: number;
  segmentsCount: number;
  personalitySummary: string;
  strengths: string[];
  weaknesses: string[];
  averageCorrectnessRating: number; // calculated from fact / (fact + error)
  averageComplexity: number;
  mostUsedKeywords: string[];
  debateStyle: string; // e.g., "Socratic", "Sophist", "Scholastic"
  conclusion: string; // AI's final thought on their performance
  
  // Voice Profile Statistics
  lowestFrequency?: number;
  highestFrequency?: number;
  medianFrequency?: number;
  frequencies?: number[];
  
  // Conversational Style Metrics
  conversationalStyle?: string; // e.g., "Deliberate and Analytical"
  speechPaceText?: string;      // e.g., "Measured Pace" or "Rapid Fire"
  vocabularyDiversity?: number; // 0 to 100 rating
  jargonDensity?: number;       // 0 to 100 rating
  selfInsightSummary?: string;  // Deep, constructive self-analysis
}

export interface DebateSession {
  segments: DebateSegment[];
  speakers: Record<string, SpeakerProfile>;
  isRecording: boolean;
  activeSpeakerId: string; // Currently speaking ID
}
