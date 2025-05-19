import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertPackageSchema, insertTripSchema, insertMatchSchema, insertChatRoomSchema, insertMessageSchema, insertReviewSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // User endpoints
  app.get("/api/users/:uid", async (req, res) => {
    try {
      const user = await storage.getUserByUid(req.params.uid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: `Error fetching user: ${error}` });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: `Error creating user: ${error}` });
    }
  });

  // Package endpoints
  app.get("/api/packages", async (req, res) => {
    try {
      const { userId, status, from, to } = req.query;
      const filters: any = {};
      
      if (userId) filters.userId = userId as string;
      if (status) filters.status = status as string;
      if (from) filters.from = from as string;
      if (to) filters.to = to as string;
      
      const packages = await storage.getPackages(filters);
      res.json(packages);
    } catch (error) {
      res.status(500).json({ message: `Error fetching packages: ${error}` });
    }
  });

  app.get("/api/packages/:id", async (req, res) => {
    try {
      const packageItem = await storage.getPackage(parseInt(req.params.id));
      if (!packageItem) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.json(packageItem);
    } catch (error) {
      res.status(500).json({ message: `Error fetching package: ${error}` });
    }
  });

  app.post("/api/packages", async (req, res) => {
    try {
      const packageData = insertPackageSchema.parse(req.body);
      const packageItem = await storage.createPackage(packageData);
      res.status(201).json(packageItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid package data", errors: error.errors });
      }
      res.status(500).json({ message: `Error creating package: ${error}` });
    }
  });

  app.patch("/api/packages/:id", async (req, res) => {
    try {
      const packageId = parseInt(req.params.id);
      const packageItem = await storage.updatePackage(packageId, req.body);
      if (!packageItem) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.json(packageItem);
    } catch (error) {
      res.status(500).json({ message: `Error updating package: ${error}` });
    }
  });

  // Trip endpoints
  app.get("/api/trips", async (req, res) => {
    try {
      const { userId, status, from, to } = req.query;
      const filters: any = {};
      
      if (userId) filters.userId = userId as string;
      if (status) filters.status = status as string;
      if (from) filters.from = from as string;
      if (to) filters.to = to as string;
      
      const trips = await storage.getTrips(filters);
      res.json(trips);
    } catch (error) {
      res.status(500).json({ message: `Error fetching trips: ${error}` });
    }
  });

  app.get("/api/trips/:id", async (req, res) => {
    try {
      const trip = await storage.getTrip(parseInt(req.params.id));
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      res.json(trip);
    } catch (error) {
      res.status(500).json({ message: `Error fetching trip: ${error}` });
    }
  });

  app.post("/api/trips", async (req, res) => {
    try {
      const tripData = insertTripSchema.parse(req.body);
      const trip = await storage.createTrip(tripData);
      res.status(201).json(trip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid trip data", errors: error.errors });
      }
      res.status(500).json({ message: `Error creating trip: ${error}` });
    }
  });

  app.patch("/api/trips/:id", async (req, res) => {
    try {
      const tripId = parseInt(req.params.id);
      const trip = await storage.updateTrip(tripId, req.body);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      res.json(trip);
    } catch (error) {
      res.status(500).json({ message: `Error updating trip: ${error}` });
    }
  });

  // Match endpoints
  app.get("/api/matches", async (req, res) => {
    try {
      const { packageId, tripId, status } = req.query;
      const filters: any = {};
      
      if (packageId) filters.packageId = parseInt(packageId as string);
      if (tripId) filters.tripId = parseInt(tripId as string);
      if (status) filters.status = status as string;
      
      const matches = await storage.getMatches(filters);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: `Error fetching matches: ${error}` });
    }
  });

  app.post("/api/matches", async (req, res) => {
    try {
      const matchData = insertMatchSchema.parse(req.body);
      const match = await storage.createMatch(matchData);
      res.status(201).json(match);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid match data", errors: error.errors });
      }
      res.status(500).json({ message: `Error creating match: ${error}` });
    }
  });

  app.patch("/api/matches/:id", async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const match = await storage.updateMatch(matchId, req.body);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      res.json(match);
    } catch (error) {
      res.status(500).json({ message: `Error updating match: ${error}` });
    }
  });

  // Chat endpoints
  app.get("/api/chats", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "UserId is required" });
      }
      
      const chats = await storage.getChatRoomsByUser(userId as string);
      res.json(chats);
    } catch (error) {
      res.status(500).json({ message: `Error fetching chats: ${error}` });
    }
  });

  app.post("/api/chats", async (req, res) => {
    try {
      const chatData = insertChatRoomSchema.parse(req.body);
      const chat = await storage.createChatRoom(chatData);
      res.status(201).json(chat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid chat data", errors: error.errors });
      }
      res.status(500).json({ message: `Error creating chat: ${error}` });
    }
  });

  app.get("/api/chats/:id/messages", async (req, res) => {
    try {
      const chatId = parseInt(req.params.id);
      const messages = await storage.getMessages(chatId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: `Error fetching messages: ${error}` });
    }
  });

  app.post("/api/chats/:id/messages", async (req, res) => {
    try {
      const chatId = parseInt(req.params.id);
      const messageData = insertMessageSchema.parse({
        ...req.body,
        chatRoomId: chatId
      });
      
      const message = await storage.createMessage(messageData);
      
      // Update last message in chat room
      await storage.updateChatRoom(chatId, {
        lastMessage: message.content,
        lastMessageTime: new Date()
      });
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: `Error creating message: ${error}` });
    }
  });

  // Review endpoints
  app.get("/api/reviews", async (req, res) => {
    try {
      const { receiverId } = req.query;
      if (!receiverId) {
        return res.status(400).json({ message: "ReceiverId is required" });
      }
      
      const reviews = await storage.getReviewsByUser(receiverId as string);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: `Error fetching reviews: ${error}` });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const reviewData = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(reviewData);
      
      // Update user rating
      const { receiverId } = reviewData;
      const reviews = await storage.getReviewsByUser(receiverId);
      
      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, rev) => sum + rev.rating, 0);
        const newRating = Math.round((totalRating / reviews.length) * 10) / 10;
        
        await storage.updateUserRating(receiverId, newRating, reviews.length);
      }
      
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid review data", errors: error.errors });
      }
      res.status(500).json({ message: `Error creating review: ${error}` });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
