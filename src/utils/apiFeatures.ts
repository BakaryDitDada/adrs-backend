import { Document, Query, Types, PopulateOptions } from 'mongoose';

interface QueryString {
  [key: string]: string | any;
}

class APIFeatures<T extends Document> {
  public query: Query<T[] | T, T>;
  private queryString: QueryString;
  private populateOptions: (string | PopulateOptions)[] = [];

  /**
   * @param query - Mongoose Query object
   * @param queryString - Request query string (for filter, sort, pagination, search, fields)
   * @param populateOptions - Array of populate paths or full PopulateOptions objects (NOT from query string)
   */
  constructor(
    query: any,
    queryString: any,
    populateOptions?: (string | PopulateOptions)[]
  ) {
    this.query = query;
    this.queryString = queryString;
    if (populateOptions) this.populateOptions = populateOptions;
  }

  // ---------- Existing Methods (unchanged) ----------
  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach(el => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    const queryObject = JSON.parse(queryStr);
    const isObjTrue = Object.keys(queryObject).map(key => queryObject[key] === "");

    if (queryStr === "{}" || isObjTrue.some(Boolean)) {
      this.query = this.query.find();
    } else {
      this.query = this.query.find({ ...JSON.parse(queryStr) });
    }

    return this;
  }

  search(searchOption: string[] | string | any, user: any = null) {
    const keyword = this.queryString.search;
    let filter: any = {};
    void user;

    if (keyword) {
      const isKeywordObjectId = Types.ObjectId.isValid(keyword);
      const orConditions: any[] = [];

      const objectIdRefFields = ['region', 'project', 'circle', 'commune', 'village'];
      const stringFields = searchOption.filter((opt: any) => !objectIdRefFields.includes(opt));

      if (stringFields.length > 0) {
        orConditions.push(
          ...stringFields.map((field: any) => ({
            [field]: { $regex: keyword, $options: 'i' }
          }))
        );
      }

      if (isKeywordObjectId) {
        const objectIdValue = new Types.ObjectId(keyword);
        orConditions.push(
          ...objectIdRefFields.map(field => ({
            [field]: objectIdValue
          }))
        );
      }

      if (orConditions.length > 0) {
        filter.$or = orConditions;
      }
    }

    if (searchOption?.includes('email')) {
      this.query = this.query.find({ ...filter });
    } else if (searchOption?.includes('owner')) {
      this.query = this.query.find({ ...filter, owner: keyword });
    } else {
      this.query = this.query.find({ ...filter });
    }

    return this;
  }

  sort(): this {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields(): this {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-_v');
    }
    return this;
  }

  paginate(): this {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 400;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  // ---------- NEW: Apply Population (not from query string) ----------
  /**
   * Call this method after all other query builders (filter, sort, paginate, etc.)
   * It applies the populate options that were passed via the constructor.
   */
  applyPopulation(): this {
    if (this.populateOptions.length) {
      this.populateOptions.forEach((opt: string | any) => {
        this.query = this.query.populate(opt);
      });
    }
    return this;
  }

  /**
   * Optional: chainable method to set/override populate options after construction.
   */
  setPopulate(populateOptions: (string | PopulateOptions)[]): this {
    this.populateOptions = populateOptions;
    return this;
  }

  /**
   * Execute the query (optional convenience method)
   */
  async execute() {
    this.applyPopulation();
    return this.query;
  }
}

export default APIFeatures;