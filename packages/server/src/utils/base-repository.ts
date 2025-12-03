import { db, getTCBApp } from '../config/database';
import { v4 as uuid } from 'uuid';

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 已创建的集合缓存
const createdCollections = new Set<string>();

/**
 * 基础仓库类 - 封装 TCB 数据库常用操作
 */
export class BaseRepository<T extends { _id?: string }> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  /**
   * 确保集合存在
   */
  async ensureCollection(): Promise<void> {
    if (createdCollections.has(this.collectionName)) {
      return;
    }
    try {
      const app = getTCBApp();
      await app.database().createCollection(this.collectionName);
      console.log(`✅ 集合 ${this.collectionName} 创建成功`);
    } catch (err: unknown) {
      const error = err as { code?: string };
      // 集合已存在则忽略
      if (
        error.code !== 'DATABASE_COLLECTION_EXIST' &&
        error.code !== 'DATABASE_COLLECTION_ALREADY_EXIST'
      ) {
        throw err;
      }
    }
    createdCollections.add(this.collectionName);
  }

  /**
   * 获取集合
   */
  protected get collection() {
    return db.collection(this.collectionName);
  }

  /**
   * 获取命令对象
   */
  protected get cmd() {
    return db.command;
  }

  /**
   * 生成 UUID
   */
  protected generateId(): string {
    return uuid();
  }

  /**
   * 创建文档
   */
  async create(data: Omit<T, '_id'> & { _id?: string }): Promise<T> {
    const now = new Date();
    const doc = {
      _id: data._id || this.generateId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection.add(doc);
    return doc as unknown as T;
  }

  /**
   * 批量创建
   */
  async createMany(dataList: Array<Omit<T, '_id'>>): Promise<T[]> {
    const now = new Date();
    const docs = dataList.map((data) => ({
      _id: this.generateId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    }));

    // TCB 不支持批量插入，需要逐个插入
    for (const doc of docs) {
      await this.collection.add(doc);
    }

    return docs as unknown as T[];
  }

  /**
   * 根据 ID 查询
   */
  async findById(id: string): Promise<T | null> {
    const { data } = await this.collection.doc(id).get();
    // TCB doc().get() may return array or single object depending on context
    if (Array.isArray(data)) {
      return (data[0] as T) || null;
    }
    return (data as unknown as T) || null;
  }

  /**
   * 根据条件查询单个
   */
  async findOne(query: Partial<T>): Promise<T | null> {
    const { data } = await this.collection.where(query as object).limit(1).get();
    return (data[0] as T) || null;
  }

  /**
   * 根据条件查询多个
   */
  async find(query: Partial<T> | object = {}): Promise<T[]> {
    const { data } = await this.collection.where(query as object).get();
    return data as T[];
  }

  /**
   * 分页查询
   */
  async findPaginated(
    query: Partial<T> | object = {},
    { page = 1, pageSize = 20 }: PaginationParams = {},
    orderBy?: { field: string; direction: 'asc' | 'desc' }
  ): Promise<PaginatedResult<T>> {
    const skip = (page - 1) * pageSize;

    // 获取总数
    const countResult = await this.collection.where(query as object).count();
    const total = countResult.total ?? 0;

    // 获取数据
    let queryBuilder = this.collection.where(query as object);

    if (orderBy) {
      queryBuilder = queryBuilder.orderBy(orderBy.field, orderBy.direction);
    }

    const { data } = await queryBuilder.skip(skip).limit(pageSize).get();

    return {
      list: data as T[],
      total,
      page,
      pageSize,
    };
  }

  /**
   * 根据 ID 更新
   */
  async updateById(id: string, data: Partial<T>): Promise<boolean> {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    // 移除 _id 字段
    delete (updateData as Partial<T> & { _id?: string })._id;

    const result = await this.collection.doc(id).update(updateData);
    return (result.updated ?? 0) > 0;
  }

  /**
   * 根据条件更新
   */
  async updateMany(query: Partial<T> | object, data: Partial<T>): Promise<number> {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    delete (updateData as Partial<T> & { _id?: string })._id;

    const result = await this.collection.where(query as object).update(updateData);
    return result.updated ?? 0;
  }

  /**
   * 根据 ID 删除
   */
  async deleteById(id: string): Promise<boolean> {
    const result = await this.collection.doc(id).remove();
    const deleted = typeof result.deleted === 'number' ? result.deleted : 0;
    return deleted > 0;
  }

  /**
   * 根据条件删除
   */
  async deleteMany(query: Partial<T> | object): Promise<number> {
    const result = await this.collection.where(query as object).remove();
    return typeof result.deleted === 'number' ? result.deleted : 0;
  }

  /**
   * 统计数量
   */
  async count(query: Partial<T> | object = {}): Promise<number> {
    const result = await this.collection.where(query as object).count();
    return result.total ?? 0;
  }

  /**
   * 检查是否存在
   */
  async exists(query: Partial<T> | object): Promise<boolean> {
    const count = await this.count(query);
    return count > 0;
  }

  /**
   * 自增字段
   */
  async increment(id: string, field: keyof T, value: number = 1): Promise<boolean> {
    const result = await this.collection.doc(id).update({
      [field]: this.cmd.inc(value),
      updatedAt: new Date(),
    });
    return (result.updated ?? 0) > 0;
  }
}
