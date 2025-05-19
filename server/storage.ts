import { 
  users, User, InsertUser,
  packages, Package, InsertPackage,
  trips, Trip, InsertTrip,
  matches, Match, InsertMatch,
  chatRooms, ChatRoom, InsertChatRoom,
  messages, Message, InsertMessage,
  reviews, Review, InsertReview
} from "@shared/schema";

// Storage interface for all CRUD operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUid(uid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  updateUserRating(uid: string, rating: number, reviewCount: number): Promise<User | undefined>;

  // Package operations
  getPackage(id: number): Promise<Package | undefined>;
  getPackages(filters?: any): Promise<Package[]>;
  createPackage(packageData: InsertPackage): Promise<Package>;
  updatePackage(id: number, packageData: Partial<Package>): Promise<Package | undefined>;

  // Trip operations
  getTrip(id: number): Promise<Trip | undefined>;
  getTrips(filters?: any): Promise<Trip[]>;
  createTrip(tripData: InsertTrip): Promise<Trip>;
  updateTrip(id: number, tripData: Partial<Trip>): Promise<Trip | undefined>;

  // Match operations
  getMatch(id: number): Promise<Match | undefined>;
  getMatches(filters?: any): Promise<Match[]>;
  createMatch(matchData: InsertMatch): Promise<Match>;
  updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined>;

  // Chat operations
  getChatRoom(id: number): Promise<ChatRoom | undefined>;
  getChatRoomsByUser(userId: string): Promise<ChatRoom[]>;
  createChatRoom(chatData: InsertChatRoom): Promise<ChatRoom>;
  updateChatRoom(id: number, chatData: Partial<ChatRoom>): Promise<ChatRoom | undefined>;
  getMessages(chatRoomId: number): Promise<Message[]>;
  createMessage(messageData: InsertMessage): Promise<Message>;

  // Review operations
  getReview(id: number): Promise<Review | undefined>;
  getReviewsByUser(userId: string): Promise<Review[]>;
  createReview(reviewData: InsertReview): Promise<Review>;
}

export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private usersUidMap: Map<string, User>;
  private packagesMap: Map<number, Package>;
  private tripsMap: Map<number, Trip>;
  private matchesMap: Map<number, Match>;
  private chatRoomsMap: Map<number, ChatRoom>;
  private messagesMap: Map<number, Message[]>;
  private reviewsMap: Map<number, Review>;
  
  private userId: number = 1;
  private packageId: number = 1;
  private tripId: number = 1;
  private matchId: number = 1;
  private chatRoomId: number = 1;
  private messageId: number = 1;
  private reviewId: number = 1;

  constructor() {
    this.usersMap = new Map();
    this.usersUidMap = new Map();
    this.packagesMap = new Map();
    this.tripsMap = new Map();
    this.matchesMap = new Map();
    this.chatRoomsMap = new Map();
    this.messagesMap = new Map();
    this.reviewsMap = new Map();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    return this.usersUidMap.get(uid);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = {
      id,
      ...userData,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date()
    };
    this.usersMap.set(id, user);
    this.usersUidMap.set(userData.uid, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.usersMap.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.usersMap.set(id, updatedUser);
    this.usersUidMap.set(user.uid, updatedUser);
    return updatedUser;
  }

  async updateUserRating(uid: string, rating: number, reviewCount: number): Promise<User | undefined> {
    const user = this.usersUidMap.get(uid);
    if (!user) return undefined;
    
    const updatedUser = { ...user, rating, reviewCount };
    this.usersMap.set(user.id, updatedUser);
    this.usersUidMap.set(uid, updatedUser);
    return updatedUser;
  }

  // Package operations
  async getPackage(id: number): Promise<Package | undefined> {
    return this.packagesMap.get(id);
  }

  async getPackages(filters?: any): Promise<Package[]> {
    let packages = Array.from(this.packagesMap.values());
    
    if (filters) {
      if (filters.userId) {
        packages = packages.filter(pkg => pkg.userId === filters.userId);
      }
      if (filters.status) {
        packages = packages.filter(pkg => pkg.status === filters.status);
      }
      if (filters.from) {
        packages = packages.filter(pkg => pkg.from === filters.from);
      }
      if (filters.to) {
        packages = packages.filter(pkg => pkg.to === filters.to);
      }
    }
    
    return packages;
  }

  async createPackage(packageData: InsertPackage): Promise<Package> {
    const id = this.packageId++;
    const newPackage: Package = {
      id,
      ...packageData,
      status: "pending",
      createdAt: new Date()
    };
    this.packagesMap.set(id, newPackage);
    return newPackage;
  }

  async updatePackage(id: number, packageData: Partial<Package>): Promise<Package | undefined> {
    const pkg = this.packagesMap.get(id);
    if (!pkg) return undefined;
    
    const updatedPackage = { ...pkg, ...packageData };
    this.packagesMap.set(id, updatedPackage);
    return updatedPackage;
  }

  // Trip operations
  async getTrip(id: number): Promise<Trip | undefined> {
    return this.tripsMap.get(id);
  }

  async getTrips(filters?: any): Promise<Trip[]> {
    let trips = Array.from(this.tripsMap.values());
    
    if (filters) {
      if (filters.userId) {
        trips = trips.filter(trip => trip.userId === filters.userId);
      }
      if (filters.status) {
        trips = trips.filter(trip => trip.status === filters.status);
      }
      if (filters.from) {
        trips = trips.filter(trip => trip.from === filters.from);
      }
      if (filters.to) {
        trips = trips.filter(trip => trip.to === filters.to);
      }
    }
    
    return trips;
  }

  async createTrip(tripData: InsertTrip): Promise<Trip> {
    const id = this.tripId++;
    const newTrip: Trip = {
      id,
      ...tripData,
      status: "active",
      createdAt: new Date()
    };
    this.tripsMap.set(id, newTrip);
    return newTrip;
  }

  async updateTrip(id: number, tripData: Partial<Trip>): Promise<Trip | undefined> {
    const trip = this.tripsMap.get(id);
    if (!trip) return undefined;
    
    const updatedTrip = { ...trip, ...tripData };
    this.tripsMap.set(id, updatedTrip);
    return updatedTrip;
  }

  // Match operations
  async getMatch(id: number): Promise<Match | undefined> {
    return this.matchesMap.get(id);
  }

  async getMatches(filters?: any): Promise<Match[]> {
    let matches = Array.from(this.matchesMap.values());
    
    if (filters) {
      if (filters.packageId) {
        matches = matches.filter(match => match.packageId === filters.packageId);
      }
      if (filters.tripId) {
        matches = matches.filter(match => match.tripId === filters.tripId);
      }
      if (filters.status) {
        matches = matches.filter(match => match.status === filters.status);
      }
    }
    
    return matches;
  }

  async createMatch(matchData: InsertMatch): Promise<Match> {
    const id = this.matchId++;
    const newMatch: Match = {
      id,
      ...matchData,
      status: "pending",
      createdAt: new Date()
    };
    this.matchesMap.set(id, newMatch);
    return newMatch;
  }

  async updateMatch(id: number, matchData: Partial<Match>): Promise<Match | undefined> {
    const match = this.matchesMap.get(id);
    if (!match) return undefined;
    
    const updatedMatch = { ...match, ...matchData };
    this.matchesMap.set(id, updatedMatch);
    return updatedMatch;
  }

  // Chat operations
  async getChatRoom(id: number): Promise<ChatRoom | undefined> {
    return this.chatRoomsMap.get(id);
  }

  async getChatRoomsByUser(userId: string): Promise<ChatRoom[]> {
    return Array.from(this.chatRoomsMap.values()).filter(
      chatRoom => (chatRoom.participants as string[]).includes(userId)
    );
  }

  async createChatRoom(chatData: InsertChatRoom): Promise<ChatRoom> {
    const id = this.chatRoomId++;
    const newChatRoom: ChatRoom = {
      id,
      ...chatData,
      lastMessage: null,
      lastMessageTime: null,
      createdAt: new Date()
    };
    this.chatRoomsMap.set(id, newChatRoom);
    this.messagesMap.set(id, []);
    return newChatRoom;
  }

  async updateChatRoom(id: number, chatData: Partial<ChatRoom>): Promise<ChatRoom | undefined> {
    const chatRoom = this.chatRoomsMap.get(id);
    if (!chatRoom) return undefined;
    
    const updatedChatRoom = { ...chatRoom, ...chatData };
    this.chatRoomsMap.set(id, updatedChatRoom);
    return updatedChatRoom;
  }

  async getMessages(chatRoomId: number): Promise<Message[]> {
    return this.messagesMap.get(chatRoomId) || [];
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const id = this.messageId++;
    const newMessage: Message = {
      id,
      ...messageData,
      read: false,
      timestamp: new Date()
    };
    
    const chatRoomMessages = this.messagesMap.get(messageData.chatRoomId) || [];
    chatRoomMessages.push(newMessage);
    this.messagesMap.set(messageData.chatRoomId, chatRoomMessages);
    
    return newMessage;
  }

  // Review operations
  async getReview(id: number): Promise<Review | undefined> {
    return this.reviewsMap.get(id);
  }

  async getReviewsByUser(userId: string): Promise<Review[]> {
    return Array.from(this.reviewsMap.values()).filter(
      review => review.receiverId === userId
    );
  }

  async createReview(reviewData: InsertReview): Promise<Review> {
    const id = this.reviewId++;
    const newReview: Review = {
      id,
      ...reviewData,
      createdAt: new Date()
    };
    this.reviewsMap.set(id, newReview);
    return newReview;
  }
}

export const storage = new MemStorage();
