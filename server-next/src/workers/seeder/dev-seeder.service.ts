import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as Bcrypt from 'bcrypt-nodejs';
import { StationTag } from 'radio/station/entities/station-tag.entity';
import { Station } from 'radio/station/entities/station.entity';
import { UserRole, UserRoleEnum } from 'radio/user/entities/user-role.entity';
import { User } from 'radio/user/entities/user.entity';
import { DeepPartial, Repository } from 'typeorm';

@Injectable()
export class DevSeederService {
  private logger = new Logger(DevSeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Station)
    private readonly stationRepository: Repository<Station>,
    @InjectRepository(StationTag)
    private readonly stationTagRepository: Repository<StationTag>,
  ) {}

  public async seed() {
    this.logger.log('Start seeder service');
    await this.seedUsers();
    await this.seedUserRoles();
    await this.seedStations();
    this.logger.log('Finish seeder service');
  }

  public async reset() {
    this.logger.log('Start resetting seeder service');
    await this.resetStations();
    await this.resetUserRoles();
    await this.resetUsers();
    this.logger.log('Finish resetting seeder service');
  }

  public async seedUsers() {
    this.logger.log('Seeding users');
    await Promise.all(this.getUserFixtures().map(user => this.userRepository.save(user)));
  }

  public async resetUsers() {
    this.logger.log('Resetting users');
    await Promise.all(
      this.getUserFixtures().map(async data => {
        const user = await this.userRepository.findOne({ where: { email: data.email } });
        return user && (await this.userRepository.remove(user));
      }),
    );
  }

  private getUserFixtures(): User[] {
    const password = Bcrypt.hashSync('123456', Bcrypt.genSaltSync(8));
    return [
      this.userRepository.create({ email: 'admin@reradio.com', username: 'admin', password }),
      this.userRepository.create({ email: 'pvtri96@reradio.com', username: 'pvtri96', password }),
      this.userRepository.create({ email: 'dungle1811@reradio.com', username: 'dungle1811', password }),
      this.userRepository.create({ email: 'lednhatkhanh@reradio.com', username: 'lednhatkhanh', password }),
      this.userRepository.create({ email: 'lybaokhanh@reradio.com', username: 'lybaokhanh', password }),
      this.userRepository.create({ email: 'thanhvinhlu@reradio.com', username: 'thanhvinhlu', password }),
      this.userRepository.create({ email: 'normie@reradio.com', username: 'normie', password }),
    ];
  }

  public async seedUserRoles() {
    this.logger.log('Seeding user roles');
    await Promise.all((await this.getUserRoleFixtures()).map(role => this.userRoleRepository.save(role)));
  }

  public async resetUserRoles() {
    this.logger.log('Resetting user roles');
    await Promise.all(
      (await this.getUserRoleFixtures()).map(async data => {
        const userRole = await this.userRoleRepository.findOne({
          where: { user: { id: data.user.id }, role: data.role },
        });
        return userRole && (await this.userRoleRepository.remove(userRole));
      }),
    );
  }

  private async getUserRoleFixtures(): Promise<UserRole[]> {
    const result: UserRole[] = [];
    const adminUsers = ['pvtri96', 'admin', 'dungle1811', 'lednhatkhanh', 'lybaokhanh', 'thanhvinhlu'];
    await Promise.all(
      adminUsers.map(async username => {
        const user = await this.userRepository.findOne({ where: { username } });
        if (user) {
          result.push(
            this.userRoleRepository.create({
              role: UserRoleEnum.ADMIN,
              user: { id: user.id },
            }),
          );
        }
      }),
    );
    return result;
  }

  public async seedStations() {
    this.logger.log('Seeding stations');
    const defaultTags = await this.stationTagRepository.save([
      this.stationTagRepository.create({ name: 'Test' }),
      this.stationTagRepository.create({ name: 'QA' }),
    ]);
    await Promise.all(
      this.getStationFixtures().map(async data => {
        const { name, slug } = data;
        let station = this.stationRepository.create({ name, slug, tags: defaultTags });
        station = await this.stationRepository.save(station);
        if (!data.owner) {
          data.owner = { username: 'admin' };
        }
        const owner = await this.userRepository.findOne({ where: { username: data.owner.username } });
        if (owner) {
          const ownerRole = this.userRoleRepository.create({ role: UserRoleEnum.STATION_OWNER, station, user: owner });
          await this.userRoleRepository.save(ownerRole);
        }
      }),
    );
  }

  public async resetStations() {
    this.logger.log('Resetting stations');
    await Promise.all(
      this.getStationFixtures().map(async data => {
        const { name, slug } = data;
        const station = await this.stationRepository.findOne({ where: { name, slug } });
        if (!data.owner) {
          data.owner = { username: 'admin' };
        }
        const owner = await this.userRepository.findOne({ where: { username: data.owner.username } });

        if (owner) {
          await this.userRoleRepository.delete({ role: UserRoleEnum.STATION_OWNER, station, user: owner });
          station && (await this.stationRepository.remove(station));
        }
      }),
    );
    await this.stationTagRepository.delete({ name: 'Test' });
    await this.stationTagRepository.delete({ name: 'QA' });
  }

  private getStationFixtures(): DeepPartial<Station & { owner: User }>[] {
    return [
      { name: 'Station A', slug: 'station-a' },
      { name: 'Station B', slug: 'station-b', owner: { username: 'pvtri96' } },
      { name: 'Station C', slug: 'station-c', owner: { username: 'dungle1811' } },
      { name: 'Station D', slug: 'station-d', owner: { username: 'lednhatkhanh' } },
      { name: 'Station E', slug: 'station-e', owner: { username: 'lybaokhanh' } },
      { name: 'Station F', slug: 'station-f', owner: { username: 'thanhvinhlu' } },
      { name: 'Station G', slug: 'station-g' },
      { name: 'Station H', slug: 'station-h' },
      { name: 'Station I', slug: 'station-i' },
      { name: 'Normie station', slug: 'normie-station', owner: { username: 'normie' } },
      ...Array(5)
        .fill(null)
        .map<Partial<Station>>((_, index) => ({ name: `Station ${index}`, slug: `station-${index}` })),
    ];
  }
}
