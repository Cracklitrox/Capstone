const whatsappService = require('./whatsapp.service');
const reservationFlow = require('./flows/reservation.flow');
const rateLimiter = require('./rate-limiter.service');

class WhatsAppController {
  /**
   * Manejar mensajes entrantes de WhatsApp
   */
  async handleMessage(from, messageText, rawMessage) {
    try {
      // Normalizar número de teléfono
      const phoneNumber = from.replace('@s.whatsapp.net', '');

      console.log(`🔄 Procesando mensaje de ${phoneNumber}: "${messageText}"`);

      // Verificar rate limit (30 mensajes por minuto)
      const rateCheck = await rateLimiter.checkLimit(phoneNumber);

      if (!rateCheck.allowed) {
        console.log(`🚫 Rate limit excedido para ${phoneNumber}. Mensajes: ${rateCheck.current}/${rateLimiter.maxMessages}`);

        const rateLimitMessage =
          '⏸️ *Demasiados mensajes*\n\n' +
          'Has enviado demasiados mensajes en poco tiempo.\n\n' +
          'Por favor espera un momento antes de continuar.\n\n' +
          'Si necesitas ayuda urgente, puedes llamarnos directamente.';

        await whatsappService.sendMessage(from, rateLimitMessage);
        return;
      }

      // Obtener o crear sesión del usuario
      const session = await whatsappService.getOrCreateSession(phoneNumber);

      // Procesar mensaje según el flujo
      const response = await reservationFlow.processMessage(
        session,
        messageText,
        phoneNumber
      );

      // Enviar respuesta
      if (response) {
        await whatsappService.sendMessage(from, response);
      }

      // Volver a obtener la sesión actualizada para verificar si se completó
      const updatedSession = await whatsappService.getOrCreateSession(phoneNumber);

      // Si el flujo terminó, crear la alerta para el recepcionista
      if (updatedSession.completed) {
        // Si el usuario estaba actualizando sus datos, guardarlos en BD
        if (updatedSession.data.isUpdatingExistingGuest && updatedSession.data.existingGuestId) {
          try {
            await whatsappService.updateGuestPersonalData(
              updatedSession.data.existingGuestId,
              updatedSession.data
            );
            console.log(`✅ Datos personales actualizados en BD para usuario ID: ${updatedSession.data.existingGuestId}`);
          } catch (error) {
            console.error('Error al actualizar datos personales:', error);
          }
        }
        // Si es un nuevo huésped (no estaba en la BD), crearlo
        else if (!updatedSession.data.foundGuest && updatedSession.data.name) {
          try {
            const newGuest = await whatsappService.createNewGuest(updatedSession.data);
            console.log(`✅ Nuevo huésped principal creado en BD con ID: ${newGuest.id}`);

            // Guardar el ID del nuevo huésped en la sesión para referencia
            updatedSession.data.guestId = newGuest.id;
          } catch (error) {
            console.error('Error al crear nuevo huésped principal:', error);
          }
        }

        // Crear o actualizar huéspedes adicionales en la BD
        if (updatedSession.data.additionalGuests && updatedSession.data.additionalGuests.length > 0) {
          try {
            await whatsappService.createOrUpdateAdditionalGuests(updatedSession.data.additionalGuests);
            console.log(`✅ Huéspedes adicionales procesados en BD`);
          } catch (error) {
            console.error('Error al procesar huéspedes adicionales:', error);
          }
        }

        try {
          await whatsappService.createBookingAlert(updatedSession);

          // Enviar mensaje de confirmación al cliente
          const confirmationMessage =
            '✅ *¡Solicitud enviada!*\n\n' +
            'Tu solicitud de reserva ha sido enviada a nuestro equipo.\n\n' +
            'Un recepcionista la revisará y se contactará contigo pronto.\n\n' +
            '¡Gracias por elegir Hotel Don Teo! 🏨';

          await whatsappService.sendMessage(from, confirmationMessage);

          // Limpiar sesión después de completar
          await whatsappService.clearSession(phoneNumber);
        } catch (alertError) {
          if (alertError.message === 'DUPLICATE_REQUEST') {
            // Ya existe una solicitud idéntica (misma habitación y fechas)
            const duplicateMessage =
              '⚠️ *Solicitud Duplicada*\n\n' +
              'Ya tienes una solicitud pendiente para esta *misma habitación y fechas*.\n\n' +
              'Un recepcionista la revisará pronto y se contactará contigo.\n\n' +
              '💡 *Tip:* Si deseas reservar una *habitación diferente*, puedes iniciar una nueva reserva escribiendo "Hola" o "Reserva".';

            await whatsappService.sendMessage(from, duplicateMessage);
            await whatsappService.clearSession(phoneNumber);
          } else {
            // Otro error al crear la alerta
            throw alertError;
          }
        }
      }

    } catch (error) {
      console.error('❌ Error en handleMessage:', error);
      console.error('Stack:', error.stack);
      
      // Limpiar sesión en caso de error para evitar loops
      const phoneNumber = from.replace('@s.whatsapp.net', '');
      try {
        await whatsappService.clearSession(phoneNumber);
      } catch (clearError) {
        console.error('Error al limpiar sesión:', clearError);
      }
      
      // Enviar mensaje de error al usuario
      const errorMessage = 
        '❌ Lo siento, ha ocurrido un error.\n\n' +
        'La conversación ha sido reiniciada.\n\n' +
        'Escribe *MENU* para ver las opciones disponibles.';
      
      try {
        await whatsappService.sendMessage(from, errorMessage);
      } catch (sendError) {
        console.error('Error al enviar mensaje de error:', sendError);
      }
    }
  }

  /**
   * Obtener estado del bot
   */
  async getStatus(req, res) {
    try {
      const status = whatsappService.getClientStatus();
      
      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('❌ Error al obtener estado:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estado del bot'
      });
    }
  }

  /**
   * Obtener código QR para autenticación
   */
  async getQR(req, res) {
    try {
      const status = whatsappService.getClientStatus();
      
      if (status.connected) {
        return res.status(200).json({
          success: true,
          message: 'El bot ya está conectado',
          connected: true
        });
      }

      if (!status.qrCode) {
        return res.status(404).json({
          success: false,
          message: 'No hay código QR disponible. Espera unos segundos.'
        });
      }

      res.status(200).json({
        success: true,
        qrCode: status.qrCode
      });
    } catch (error) {
      console.error('❌ Error al obtener QR:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener código QR'
      });
    }
  }

  /**
   * Desconectar el bot
   */
  async disconnect(req, res) {
    try {
      await whatsappService.disconnect();
      
      res.status(200).json({
        success: true,
        message: 'Bot desconectado exitosamente'
      });
    } catch (error) {
      console.error('❌ Error al desconectar:', error);
      res.status(500).json({
        success: false,
        message: 'Error al desconectar el bot'
      });
    }
  }

  /**
   * Limpiar credenciales y generar nuevo QR
   */
  async clearAuth(req, res) {
    try {
      await whatsappService.clearAuth();
      
      res.status(200).json({
        success: true,
        message: 'Credenciales eliminadas. Generando nuevo QR...'
      });
    } catch (error) {
      console.error('❌ Error al limpiar credenciales:', error);
      res.status(500).json({
        success: false,
        message: 'Error al limpiar credenciales'
      });
    }
  }

  /**
   * Enviar mensaje manual (para recepcionistas/admins)
   */
  async sendManualMessage(req, res) {
    try {
      const { phoneNumber, message } = req.body;

      // Validar campos
      if (!phoneNumber || !message) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere número de teléfono y mensaje'
        });
      }

      // Formatear número
      const formattedPhone = phoneNumber.includes('@') 
        ? phoneNumber 
        : `${phoneNumber}@s.whatsapp.net`;

      await whatsappService.sendMessage(formattedPhone, message);

      res.status(200).json({
        success: true,
        message: 'Mensaje enviado exitosamente'
      });
    } catch (error) {
      console.error('❌ Error al enviar mensaje:', error);
      res.status(500).json({
        success: false,
        message: 'Error al enviar mensaje'
      });
    }
  }

  /**
   * Obtener estadísticas del bot
   */
  async getStats(req, res) {
    try {
      const stats = await whatsappService.getStats();
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas'
      });
    }
  }
}

module.exports = new WhatsAppController();