// import { BaseRepository } from '../base/base.repository.js';
import { BaseRepository } from '../base/base.repository.js';
import { AiConversation, IAiConversation, AiReport, IAiReport } from './ai.model.js';
import { Types } from 'mongoose';

export class AiRepository {
  // Conversations
  async createConversation(userId: string, title?: string): Promise<IAiConversation> {
    return AiConversation.create({ userId: new Types.ObjectId(userId), title: title || 'New Conversation' });
  }

  async addMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
    await AiConversation.findByIdAndUpdate(conversationId, {
      $push: { messages: { role, content, createdAt: new Date() } }
    });
  }

  async getConversation(conversationId: string, userId: string): Promise<IAiConversation | null> {
    return AiConversation.findOne({ _id: conversationId, userId: new Types.ObjectId(userId) }).exec();
  }

  async getUserConversations(userId: string, limit = 20): Promise<IAiConversation[]> {
    return AiConversation.find({ userId: new Types.ObjectId(userId) })
      .sort({ updateAt: -1 })
      .limit(limit)
      .exec();
  }

  async deleteConversationById(id: string): Promise<boolean> {
    const result = await AiConversation.findByIdAndDelete(id).exec();
    return result !== null;
  }

  // Reports
  async saveReport(userId: string, type: string, content: string): Promise<IAiReport> {
    return AiReport.create({
      userId: new Types.ObjectId(userId),
      type,
      content
      // query, // Removed because 'query' is not a valid field in the AiReport schema
    });
  }

  async getUserReports(userId: string, limit = 20): Promise<IAiReport[]> {
    return AiReport.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async deleteReportById(id: string): Promise<boolean> {
    const result = await AiReport.findByIdAndDelete(id).exec();
    return result !== null;
  }
}