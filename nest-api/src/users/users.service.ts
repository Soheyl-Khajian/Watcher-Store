// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { RegisterUserDto } from 'src/auth/dto/register-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOneByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(
    registerDto: RegisterUserDto,
    hashedPassword_hash: string,
  ): Promise<User> {
    const newUser = this.usersRepository.create({
      email: registerDto.email,
      password_hash: hashedPassword_hash,
    });
    return this.usersRepository.save(newUser);
  }
}
