export type Role = "OWNER" | "PROFESSOR";
export type LessonType = "TURMA" | "PERSONAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Lesson {
  id: string;
  date: string;
  time: string;
  type: LessonType;
  professorId: string;
  assistantId: string;
  professorValue: string;
  assistantValue: string;
  observation?: string | null;
  assistant?: { id: string; name: string };
}

export interface Periodo {
  start: string;
  end: string;
  label: string;
}

export interface ResumoProfessor {
  periodo: Periodo;
  totalTurmas: number;
  totalPersonais: number;
  valorAulas: number;
  valorComoAuxiliar: number;
  totalReceber: number;
  aulas: Lesson[];
  aulasComoAuxiliar: (Lesson & { professor: { name: string } })[];
}

export interface ResumoGeralItem {
  professorId: string;
  nome: string;
  totalAulas: number;
  valorAulas: number;
  valorComoAuxiliar: number;
  totalReceber: number;
}

export interface ResumoGeral {
  periodo: Periodo;
  professores: ResumoGeralItem[];
}
