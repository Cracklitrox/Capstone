const makeWASocket = require('@whiskeysockets/baileys').default;
const {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const path = require('path');

class WhatsAppClient {
  constructor(io) {
    this.sock = null;
    this.io = io; // Socket.IO para notificaciones en tiempo real
    this.qrCode = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.messageHandler = null;
    
    // Path para guardar la sesión
    this.sessionPath = path.join(__dirname, 'sessions');
  }

  /**
   * Inicializar el cliente de WhatsApp
   */
  async initialize() {
    try {
      console.log('🔄 Inicializando cliente de WhatsApp...');
      
      // Obtener la última versión de Baileys
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`📱 Usando WA versión ${version}, es la última: ${isLatest}`);

      // Cargar o crear estado de autenticación
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

      // Logger configurado (silencioso en producción)
      const logger = pino({ 
        level: process.env.NODE_ENV === 'production' ? 'silent' : 'info' 
      });

      // Crear socket de WhatsApp
      this.sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false, // Lo manejamos manualmente
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: Browsers.ubuntu('Chrome'), // Simular navegador
        getMessage: async (key) => {
          // Retornar mensaje de caché si es necesario
          return { conversation: '' };
        },
      });

      // Configurar event handlers
      this.setupEventHandlers(saveCreds);

      return true;
    } catch (error) {
      console.error('❌ Error al inicializar WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Configurar manejadores de eventos
   */
  setupEventHandlers(saveCreds) {
    // Actualización de credenciales
    this.sock.ev.on('creds.update', saveCreds);

    // Actualización de conexión
    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Mostrar QR si está disponible
      if (qr) {
        this.qrCode = qr;
        console.log('📱 QR Code generado. Escanea con WhatsApp:');
        qrcode.generate(qr, { small: true });
        
        // Notificar al frontend vía Socket.IO
        if (this.io) {
          this.io.to('role:administrator').emit('whatsapp:qr', { qr });
        }
      }

      // Estado de conexión
      if (connection === 'close') {
        this.isConnected = false;
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        
        console.log('❌ Conexión cerrada. Reconectar:', shouldReconnect);

        // Notificar desconexión
        if (this.io) {
          this.io.to('role:administrator').emit('whatsapp:status', {
            connected: false,
            reason: lastDisconnect?.error?.message || 'Desconectado'
          });
        }

        // Intentar reconectar
        if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 Reintentando conexión (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.initialize(), 5000);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('❌ Máximo de reintentos alcanzado. Deteniendo reconexión.');
        }
      } else if (connection === 'open') {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.qrCode = null;
        
        console.log('✅ WhatsApp conectado exitosamente!');
        
        // Notificar conexión exitosa
        if (this.io) {
          this.io.to('role:administrator').emit('whatsapp:status', {
            connected: true,
            message: 'Bot de WhatsApp conectado'
          });
        }
      }
    });

    // Mensajes entrantes
    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type === 'notify') {
        for (const message of messages) {
          // Ignorar mensajes propios
          if (message.key.fromMe) continue;
          
          // Procesar mensaje
          await this.handleIncomingMessage(message);
        }
      }
    });
  }

  /**
   * Manejar mensajes entrantes
   */
  async handleIncomingMessage(message) {
    try {
      // Extraer datos del mensaje
      const from = message.key.remoteJid;
      const messageText = message.message?.conversation || 
                         message.message?.extendedTextMessage?.text || '';
      
      // Ignorar mensajes vacíos
      if (!messageText) return;

      console.log(`📩 Mensaje de ${from}: ${messageText}`);

      // Delegar al handler de mensajes (se configurará en whatsapp.controller.js)
      if (this.messageHandler) {
        await this.messageHandler(from, messageText, message);
      }
    } catch (error) {
      console.error('❌ Error al procesar mensaje:', error);
    }
  }

  /**
   * Enviar mensaje de texto
   */
  async sendMessage(to, text) {
    try {
      if (!this.isConnected) {
        throw new Error('WhatsApp no está conectado');
      }

      await this.sock.sendMessage(to, { text });
      console.log(`✅ Mensaje enviado a ${to}`);
      return true;
    } catch (error) {
      console.error('❌ Error al enviar mensaje:', error);
      throw error;
    }
  }

  /**
   * Registrar handler de mensajes
   */
  setMessageHandler(handler) {
    this.messageHandler = handler;
  }

  /**
   * Obtener estado de conexión
   */
  getStatus() {
    return {
      connected: this.isConnected,
      qrCode: this.qrCode,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Desconectar manualmente
   */
  async disconnect() {
    try {
      if (this.sock) {
        await this.sock.logout();
        this.isConnected = false;
        console.log('👋 WhatsApp desconectado');
        return true;
      }
    } catch (error) {
      console.error('❌ Error al desconectar:', error);
      throw error;
    }
  }
}

module.exports = WhatsAppClient;
