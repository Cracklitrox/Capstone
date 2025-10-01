// Controlador para endpoints de administración de habitaciones y tipos de habitaciones
const prisma = require('../../../db/prisma.client');

module.exports = {
  // Listar habitaciones
  async listRooms(req, res, next) {
    try {
      const rooms = await prisma.rooms.findMany({
        include: { room_types: true }
      });
      res.json(rooms);
    } catch (err) {
      next(err);
    }
  },

  // Listar tipos de habitaciones
  async listRoomTypes(req, res, next) {
    try {
      const roomTypes = await prisma.room_types.findMany();
      res.json(roomTypes);
    } catch (err) {
      next(err);
    }
  },

  // Crear habitación
  async createRoom(req, res, next) {
    try {
      const { room_number, floor, room_type_id, capacity, base_price, status, description, is_active } = req.body;
      const newRoom = await prisma.rooms.create({
        data: { room_number, floor, room_type_id, capacity, base_price, status, description, is_active }
      });
      res.status(201).json(newRoom);
    } catch (err) {
      next(err);
    }
  },

  // Crear tipo de habitación
  async createRoomType(req, res, next) {
    try {
      const { name, base_capacity, description, is_active } = req.body;
      const newType = await prisma.room_types.create({
        data: { name, base_capacity, description, is_active }
      });
      res.status(201).json(newType);
    } catch (err) {
      next(err);
    }
  },

  // Modificar habitación
  async updateRoom(req, res, next) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updatedRoom = await prisma.rooms.update({
        where: { id: Number(id) },
        data
      });
      res.json(updatedRoom);
    } catch (err) {
      next(err);
    }
  },

  // Modificar tipo de habitación
  async updateRoomType(req, res, next) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updatedType = await prisma.room_types.update({
        where: { id: Number(id) },
        data
      });
      res.json(updatedType);
    } catch (err) {
      next(err);
    }
  },

  // Eliminar habitación
  async deleteRoom(req, res, next) {
    try {
      const { id } = req.params;
      await prisma.rooms.delete({ where: { id: Number(id) } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  // Eliminar tipo de habitación
  async deleteRoomType(req, res, next) {
    try {
      const { id } = req.params;
      await prisma.room_types.delete({ where: { id: Number(id) } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  // Ver más habitación
  async getRoomDetail(req, res, next) {
    try {
      const { id } = req.params;
      const room = await prisma.rooms.findUnique({
        where: { id: Number(id) },
        include: { room_types: true }
      });
      res.json(room);
    } catch (err) {
      next(err);
    }
  },

  // Ver más tipo de habitación
  async getRoomTypeDetail(req, res, next) {
    try {
      const { id } = req.params;
      const type = await prisma.room_types.findUnique({
        where: { id: Number(id) }
      });
      res.json(type);
    } catch (err) {
      next(err);
    }
  }
};
