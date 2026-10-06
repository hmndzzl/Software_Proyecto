import { getClerkClient } from '../config/clerk';
import { HttpStatus } from '../utils/httpStatus';

export interface CambiosPerfilClerk {
  password?: string;
  /** Correo nuevo; solo se envía si de verdad cambió. */
  correoNuevo?: string;
  /** Correo que la persona tiene hoy en la BD, para retirarlo de Clerk. */
  correoAnterior: string;
}

export interface ErrorSincronizacion {
  status: HttpStatus;
  mensaje: string;
}

interface ClerkApiError {
  status?: number;
  errors?: Array<{ code?: string; longMessage?: string }>;
}

const minusculas = (valor: string) => valor.toLowerCase();

/**
 * Refleja en Clerk los cambios de contraseña y correo del perfil. Se llama ANTES de guardar en la
 * BD: si devuelve un error, no se debe tocar la BD, para que ambos lados no queden distintos.
 *
 * Con correo nuevo: se agrega a Clerk ya verificado (la app no pide verificarlo, igual que antes),
 * se pone como principal junto con la contraseña en una sola llamada, y recién entonces se retira
 * el correo anterior. Si falla en el medio, se deshace el correo recién agregado.
 *
 * Devuelve null si todo salió bien, o el error HTTP que hay que responder.
 */
export async function sincronizarPerfilEnClerk(
  clerkUserId: string,
  { password, correoNuevo, correoAnterior }: CambiosPerfilClerk
): Promise<ErrorSincronizacion | null> {
  const clerk = getClerkClient();
  let correoAgregadoId: string | null = null;

  try {
    if (!correoNuevo) {
      if (password) await clerk.users.updateUser(clerkUserId, { password });
      return null;
    }

    const usuario = await clerk.users.getUser(clerkUserId);
    const yaExistente = usuario.emailAddresses.find((e) => minusculas(e.emailAddress) === minusculas(correoNuevo));

    let nuevoId: string;
    if (yaExistente) {
      nuevoId = yaExistente.id;
      if (yaExistente.verification?.status !== 'verified') {
        await clerk.emailAddresses.updateEmailAddress(nuevoId, { verified: true });
      }
    } else {
      const creado = await clerk.emailAddresses.createEmailAddress({
        userId: clerkUserId,
        emailAddress: correoNuevo,
        verified: true,
      });
      nuevoId = creado.id;
      correoAgregadoId = creado.id;
    }

    await clerk.users.updateUser(clerkUserId, {
      primaryEmailAddressID: nuevoId,
      ...(password ? { password } : {}),
    });

    // Retirar el correo anterior es "lo mejor posible": si falla, la persona ya entra con el nuevo.
    const anteriores = usuario.emailAddresses.filter(
      (e) => minusculas(e.emailAddress) === minusculas(correoAnterior) && e.id !== nuevoId
    );
    for (const anterior of anteriores) {
      try {
        await clerk.emailAddresses.deleteEmailAddress(anterior.id);
      } catch (error) {
        console.error('No se pudo retirar el correo anterior de Clerk:', error);
      }
    }
    return null;
  } catch (error) {
    if (correoAgregadoId) {
      try {
        await clerk.emailAddresses.deleteEmailAddress(correoAgregadoId);
      } catch (rollbackError) {
        console.error('No se pudo deshacer el correo agregado en Clerk:', rollbackError);
      }
    }
    return traducirErrorClerk(error);
  }
}

// 422 = Clerk rechazó el dato (contraseña débil, correo inválido, correo ya en uso en otra cuenta);
// cualquier otro fallo = Clerk no disponible.
function traducirErrorClerk(error: unknown): ErrorSincronizacion {
  const { status, errors } = error as ClerkApiError;

  if (status === 422) {
    if (errors?.some((e) => e.code === 'form_identifier_exists')) {
      return { status: HttpStatus.CONFLICT, mensaje: 'El correo ya está en uso por otra persona' };
    }
    return {
      status: HttpStatus.BAD_REQUEST,
      mensaje: errors?.[0]?.longMessage ?? 'Los datos no cumplen los requisitos de seguridad',
    };
  }

  console.error('No se pudo sincronizar el perfil con Clerk:', error);
  return {
    status: HttpStatus.BAD_GATEWAY,
    mensaje: 'No se pudo actualizar tu perfil. Intenta de nuevo en unos minutos.',
  };
}
