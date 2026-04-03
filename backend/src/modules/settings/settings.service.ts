import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppSettings, AppSettingsDocument } from './settings.schema';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(AppSettings.name) private model: Model<AppSettingsDocument>,
  ) {}

  private async getDoc(): Promise<AppSettingsDocument> {
    let doc = await this.model.findOne().exec();
    if (!doc) {
      doc = await this.model.create({ tmdbAccessToken: '' });
    }
    return doc;
  }

  async getSettings(): Promise<AppSettings> {
    return this.getDoc();
  }

  async updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
    const doc = await this.getDoc();
    Object.assign(doc, data);
    return doc.save();
  }

  async getTmdbToken(): Promise<string> {
    const doc = await this.getDoc();
    return doc.tmdbAccessToken ?? '';
  }
}
