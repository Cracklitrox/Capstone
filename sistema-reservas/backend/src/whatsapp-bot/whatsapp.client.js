import makeWASocket from '@whiskeysockets/baileys';
import {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      
      // Obtener la última versión de Baileys
      const { version, isLatest } = await fetchLatestBaileysVersion();

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
        qrcode.generate(qr, { small: true });
        
        // Notificar al frontend vía Socket.IO
        if (this.io) {
          this.io.to('role:administrator').emit('whatsapp:qr', { qr });
        }
      }

      // Estado de conexión
      if (connection === 'close') {
        this.isConnected = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        

        // Notificar desconexión
        if (this.io) {
          this.io.to('role:administrator').emit('whatsapp:status', {
            connected: false,
            reason: lastDisconnect?.error?.message || 'Desconectado'
          });
        }

        // Intentar reconectar automáticamente
        if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(5000 * this.reconnectAttempts, 30000); // Backoff exponencial hasta 30s
          setTimeout(() => this.initialize(), delay);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        } else {
        }
      } else if (connection === 'open') {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.qrCode = null;
        
        
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


      // Delegar al handler de mensajes (se configurará en whatsapp.controller.js)
      if (this.messageHandler) {
        await this.messageHandler(from, messageText, message);
      }
    } catch (error) {
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
      return true;
    } catch (error) {
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
        return true;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Limpiar credenciales y permitir nuevo QR
   */
  async clearAuth() {
    try {
      const authPath = path.join(process.cwd(), this.authPath);
      
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
      }
      
      // Resetear estado
      this.isConnected = false;
      this.reconnectAttempts = 0;
      this.qrCode = null;
      
      // Reinicializar para generar nuevo QR
      await this.initialize();
      
      return true;
    } catch (error) {
      throw error;
    }
  }
}

export default WhatsAppClient;
