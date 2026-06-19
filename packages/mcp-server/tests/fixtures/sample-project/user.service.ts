export class UserService {
  private db: any;

  async findById(id: string) {
    return this.db.find(id);
  }

  async create(data: any) {
    return this.db.save(data);
  }
}
