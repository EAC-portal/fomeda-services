// Authentication controller

import { Body, Controller, Get, Param, Post, Put, Patch, Query } from '@nestjs/common';
import { AnnouncementDto } from '../dtos/announcement.dto';
import { AnnouncementService } from '../services/implementations/announcement.service';

@Controller('announcement')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {
  }

  @Get('find-all-announcement')
  async getAllAnnouncement() {
    return this.announcementService.findAllAnnouncements();
  }

  @Post('create-announcement')
  async createAnnouncement(@Body() announcementDto: AnnouncementDto) {
    return this.announcementService.createAnnouncement(announcementDto);
  }

  @Patch('edit-announcement')
  async editAnnouncement(@Query("id") id: string, @Body() announcementDto: AnnouncementDto) {
    return this.announcementService.editAnnouncement(id, announcementDto);
  }
}