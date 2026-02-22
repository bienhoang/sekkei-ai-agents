export class UserService {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async findById(id: string): Promise<User | null> {
    return this.db.findOne(id);
  }

  async create(data: CreateUserDto): Promise<User> {
    return this.db.create(data);
  }
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateUserDto {
  name: string;
  email: string;
}
