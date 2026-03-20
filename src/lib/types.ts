export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
}

export interface ContentSection {
  id: string;
  title: string;
  icon: string;
  estimatedMinutes: number;
  content: string;
  completed: boolean;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface GeneratedContent {
  destination: string;
  country: string;
  flightDuration: number;
  totalReadingMinutes: number;
  sections: ContentSection[];
  quizQuestions?: QuizQuestion[];
  topic?: string;
}

export interface ShareCardData {
  destination: string;
  country: string;
  sectionsCompleted: number;
  totalSections: number;
  quizScore: number;
  quizTotal: number;
  flightDuration: number;
  sectionTitles: string[];
  highlights: string[];
  topic?: string;
}

export interface StreamState {
  destination: string;
  country: string;
  topic?: string;
  totalSections: number;
  sectionTitles: { id: string; title: string; icon: string }[];
  completedCount: number;
  currentIndex: number;
  currentTitle: string;
}
