export type PerfilUsuario = 'ADMINISTRADOR' | 'RESPONSAVEL';

export interface UsuarioAutenticado {
  email: string;
  nome: string;
  perfil: PerfilUsuario;
  /** Presente apenas quando perfil === 'RESPONSAVEL'. */
  responsavelId?: string;
}
