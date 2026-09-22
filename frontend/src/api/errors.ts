import { AxiosError } from "axios";

export function getErrorMessage(
  error: unknown,
  fallback = "Algo deu errado. Tente novamente.",
) {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;
    const serverText = Array.isArray(serverMessage)
      ? serverMessage.join(" ")
      : serverMessage;

    switch (status) {
      case 400:
        return (
          serverText || "Dados inválidos. Confira os campos e tente novamente."
        );
      case 401:
        return "Sua sessão expirou. Faça login novamente.";
      case 403:
        return "Você não tem permissão para fazer isso.";
      case 404:
        return "Não encontrado.";
      case 409:
        return serverText || "Já existe um registro com esses dados.";
      case 429:
        return "Muitas tentativas seguidas. Aguarde um pouco antes de tentar de novo.";
      case 500:
        return "Erro interno do servidor. Tente novamente em instantes.";
      default:
        if (!error.response)
          return "Não foi possível conectar ao servidor. Verifique sua internet.";
        return serverText || fallback;
    }
  }
  return fallback;
}
