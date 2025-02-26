import { Inject, Injectable } from "@nestjs/common";
import { ISubcategorySpecificationService } from "../interfaces/subcategory-specification.service.interface";
import { SubcategorySpecificationDto } from "../../dtos/subcategory-specification.dto";
import { SubcategorySubspecificationDto } from "../../dtos/subcategory-subspecification.dto";
import { SubcategorySpecificationRepository } from "../../domain/repositories/subcategory-specification.repository";
import { SequenceService } from "../../../sequence/services/implementations/sequence.services";
import {
  SubcategorySubspecificationRepository
} from "../../domain/repositories/subcategory-subspecification.repository";
import { SequenceConstant } from "../../../../common/constant/sequence.constant";
import { BaseSpecificationService } from "./base-specification.service";
import { CategoryMapper } from "../mapper/category.mapper";
import { CategoryService } from "./category.service";
import { IBaseSpecificationService } from "../interfaces/base-specification.service.interface";
import { ICategoryService } from "../interfaces/category.service.interface";
import { ISequenceService } from "../../../sequence/services/interfaces/sequence.service.interface";
import { ObjectUtils } from "../../../../common/utils/object.utils";
import { CategoryErrorConstant, CategoryException } from "../../../../common/exception/category.exception";
import { StringUtils } from "../../../../common/utils/string.utils";
import { ProductFormSpecificationDto } from "../../dtos/product-form-specification.dto";
import { GeneralSpecificationService } from "./general-specification.service";
import { IGeneralSpecificationService } from "../interfaces/general-specification.service.interface";
import { Request } from "express";

@Injectable()
export class SubcategorySpecificationService implements ISubcategorySpecificationService {
  constructor(
    private readonly subcategorySpecificationRepository: SubcategorySpecificationRepository,
    private readonly subcategorySubspecificationRepository: SubcategorySubspecificationRepository,
    private readonly categoryMapper: CategoryMapper,
    @Inject(SequenceService.name) private readonly sequenceService: ISequenceService,
    @Inject(CategoryService.name) private readonly categoryService: ICategoryService,
    @Inject(BaseSpecificationService.name) private readonly baseSpecificationService: IBaseSpecificationService,
    @Inject(GeneralSpecificationService.name) private readonly generalSpecificationService: IGeneralSpecificationService,
  ) {
  }

  async createSubcategorySpecification(req: Request, subcategorySpecificationDto: SubcategorySpecificationDto): Promise<SubcategorySpecificationDto> {
    if (ObjectUtils.isEmpty(subcategorySpecificationDto) || StringUtils.isEmpty(subcategorySpecificationDto.subcat_spec_name)) {
      throw new CategoryException(CategoryErrorConstant.INVALID_SPECIFICATION);
    }

    const subcategory = await this.categoryService.findOneSubcategoryById(subcategorySpecificationDto.subcat_id);
    const specification = await this.subcategorySpecificationRepository.findBySpecificationName(subcategorySpecificationDto.subcat_spec_name.trim(), subcategorySpecificationDto.cat_type, subcategorySpecificationDto.subcat_id, subcategory.cat_id);
    if(ObjectUtils.isNotEmpty(specification)) {
      throw new CategoryException(CategoryErrorConstant.DUPLICATE_SPECIFICATION);
    }

    const _id = await this.sequenceService.generateId(
      SequenceConstant.PRODUCT_SPECIFICATION_PREFIX
    );
    const user_id = req.user;

    const result = await this.subcategorySpecificationRepository.create({ ...subcategorySpecificationDto, _id, created_by: user_id, last_updated_by: user_id });
    return this.categoryMapper.mapSchemaToModel(result, SubcategorySpecificationDto);
  }

  async findSubcategorySpecificationByCatId(id: string): Promise<SubcategorySpecificationDto[]> {
    const subcategory = await this.categoryService.findOneSubcategoryById(id);
    const baseSpecList = this.categoryMapper.mapBaseSpecificationDtoListToSubcategorySpecificationDtoList(
      await this.baseSpecificationService.findBaseSpecificationByCatId(subcategory.cat_id)
    );

    const specificationList = await this.subcategorySpecificationRepository.findAllByFilterWithUsername({ subcat_id: id });
    const specificationIdList = specificationList.map(spec => spec._id);
    const subspecificationList = await this.subcategorySubspecificationRepository.findAllByFilterWithUsername({ subcat_spec_id: { $in: specificationIdList } });

    const result = specificationList.map(spec => {
      const filteredSubspec = subspecificationList.filter(subspec => subspec.subcat_spec_id === spec._id.toString());
      return filteredSubspec.length > 0 ? { ...spec, children: filteredSubspec } : spec;
    });

    return [...baseSpecList, ...result];
  }

  async findActiveSubcategorySpecificationByCatId(id: string): Promise<SubcategorySpecificationDto[]> {
    const subcategory = await this.categoryService.findOneSubcategoryById(id);
    const baseSpecList = this.categoryMapper.mapBaseSpecificationDtoListToSubcategorySpecificationDtoList(
      await this.baseSpecificationService.findActiveBaseSpecificationByCatId(subcategory.cat_id)
    );

    const specificationList = await this.subcategorySpecificationRepository.findAllByFilter({ subcat_id: id, is_active: true });
    const specificationIdList = specificationList.map(spec => spec._id);
    const subspecificationList = await this.subcategorySubspecificationRepository.findAllByFilter({ subcat_spec_id: { $in: specificationIdList}, is_active: true });

    const result = specificationList.map(spec => {
      const filteredSubspec = subspecificationList.filter(subspec => subspec.subcat_spec_id === spec._id.toString());
      return filteredSubspec.length > 0 ? { ...spec.toObject(), children: filteredSubspec } : spec.toObject();
    });

    return [...baseSpecList, ...result];
  }

  async findActiveSubcategorySpecificationByCatIdsAndSubcatIds(cat_ids: string[], subcat_ids: string[]): Promise<SubcategorySpecificationDto[]> {
    const generalSpecList = await this.generalSpecificationService.findAllActiveGeneralSpecification();

    const baseSpecList = await this.baseSpecificationService.findActiveBaseSpecificationByCatIds(cat_ids);

    let result = []
    if(subcat_ids && subcat_ids.length > 0) {
      const specificationList = await this.subcategorySpecificationRepository.findAllByFilter({
        subcat_id: { $in: subcat_ids },
        is_active: true
      });
      const specificationIdList = specificationList.map(spec => spec._id);
      const subspecificationList = await this.subcategorySubspecificationRepository.findAllByFilter({
        subcat_spec_id: { $in: specificationIdList },
        is_active: true
      });

      result = specificationList.map(spec => {
        const filteredSubspec = subspecificationList.filter(subspec => subspec.subcat_spec_id === spec._id.toString());
        return filteredSubspec.length > 0 ? { ...spec.toObject(), children: filteredSubspec } : spec.toObject();
      });
    }

    return [...generalSpecList, ...baseSpecList, ...result];
  }

  async findSubcategorySpecificationById(id: string): Promise<SubcategorySpecificationDto> {
    const result = await this.subcategorySpecificationRepository.findOneById(id);

    if (ObjectUtils.isEmpty(result)) {
      throw new CategoryException(CategoryErrorConstant.SPECIFICATION_NOT_FOUND);
    }

    return this.categoryMapper.mapSchemaToModel(result.toObject(), SubcategorySpecificationDto);
  }

  async getProductSpecificationBySubcatId(id: string): Promise<ProductFormSpecificationDto[]> {
    const specifications = await this.findSubcategorySpecificationByCatId(id);
    specifications
      .filter(spec => spec.is_active)
      .map(spec => ({
        ...spec,
        children: spec.children?.filter(subspec => subspec.is_active) || []
      }));
    return this.categoryMapper.mapSubcategorySpecificationListToProductSpecificationFormDtoList(specifications);
  }


  async updateSubcategorySpecification(req: Request, id: string, subcategorySpecificationDto: SubcategorySpecificationDto): Promise<SubcategorySpecificationDto> {
    if (ObjectUtils.isEmpty(subcategorySpecificationDto) || StringUtils.isEmpty(subcategorySpecificationDto.subcat_spec_name)) {
      throw new CategoryException(CategoryErrorConstant.INVALID_SPECIFICATION);
    }

    const subcategory = await this.categoryService.findOneSubcategoryById(subcategorySpecificationDto.subcat_id);
    const specification = await this.subcategorySpecificationRepository.findBySpecificationName(subcategorySpecificationDto.subcat_spec_name.trim(), subcategorySpecificationDto.cat_type, subcategorySpecificationDto.subcat_id, subcategory.cat_id);
    if(ObjectUtils.isNotEmpty(specification)) {
      throw new CategoryException(CategoryErrorConstant.DUPLICATE_SPECIFICATION);
    }

    const user_id = String(req.user);

    subcategorySpecificationDto = { ...subcategorySpecificationDto, last_updated_on: new Date(), last_updated_by: user_id };
    const result = await this.subcategorySpecificationRepository.update(id, subcategorySpecificationDto);

    if (ObjectUtils.isEmpty(result)) {
      throw new CategoryException(CategoryErrorConstant.SPECIFICATION_NOT_FOUND);
    }

    return this.categoryMapper.mapSchemaToModel(result, SubcategorySpecificationDto);
  }

  async deactivateSubcategorySpecification(req: Request, id: string, is_active: boolean): Promise<SubcategorySpecificationDto> {
    const result = await this.subcategorySpecificationRepository.deactivateSubcategorySpecificationById(req, id, is_active);

    if (ObjectUtils.isEmpty(result)) {
      throw new CategoryException(CategoryErrorConstant.SPECIFICATION_NOT_FOUND);
    }

    return this.categoryMapper.mapSchemaToModel(result, SubcategorySpecificationDto);
  }

  async deleteSubcategorySpecification(id: string): Promise<SubcategorySpecificationDto> {
    await this.subcategorySubspecificationRepository.deleteSubcategorySubspecificationBySpecId(id);
    const result = await this.subcategorySpecificationRepository.delete(id);

    if (ObjectUtils.isEmpty(result)) {
      throw new CategoryException(CategoryErrorConstant.SPECIFICATION_NOT_FOUND);
    }

    return this.categoryMapper.mapSchemaToModel(result, SubcategorySpecificationDto);
  }

  async createSubcategorySubspecification(req: Request, subcategorySubspecificationDto: SubcategorySubspecificationDto): Promise<SubcategorySubspecificationDto> {
    if (ObjectUtils.isEmpty(subcategorySubspecificationDto) || StringUtils.isEmpty(subcategorySubspecificationDto.subcat_subspec_name)) {
      throw new CategoryException(CategoryErrorConstant.INVALID_SPECIFICATION);
    }

    const subspecification = await this.subcategorySubspecificationRepository.findBySubspecificationName(subcategorySubspecificationDto.subcat_spec_id, subcategorySubspecificationDto.subcat_subspec_name.trim());
    if(ObjectUtils.isNotEmpty(subspecification)){
      throw new CategoryException(CategoryErrorConstant.DUPLICATE_SUBSPECIFICATION);
    }

    const _id = await this.sequenceService.generateId(
      SequenceConstant.PRODUCT_SUBSPECIFICATION_PREFIX
    );
    const user_id = req.user;

    const result = await this.subcategorySubspecificationRepository.create({ ...subcategorySubspecificationDto, _id, created_by: user_id, last_updated_by: user_id });
    return this.categoryMapper.mapSchemaToModel(result, SubcategorySubspecificationDto);
  }


  async findSubcategorySubspecificationById(id: string): Promise<SubcategorySubspecificationDto> {
    const result = await this.subcategorySubspecificationRepository.findOneById(id);

    if (ObjectUtils.isEmpty(result)) {
      throw new CategoryException(CategoryErrorConstant.SPECIFICATION_NOT_FOUND);
    }

    return this.categoryMapper.mapSchemaToModel(result.toObject(), SubcategorySubspecificationDto);
  }

  async updateSubcategorySubspecification(req: Request, id: string, subcategorySubspecificationDto: SubcategorySubspecificationDto): Promise<SubcategorySubspecificationDto> {
    if (ObjectUtils.isEmpty(subcategorySubspecificationDto) || StringUtils.isEmpty(subcategorySubspecificationDto.subcat_subspec_name)) {
      throw new CategoryException(CategoryErrorConstant.INVALID_SPECIFICATION);
    }

    const subspecification = await this.subcategorySubspecificationRepository.findBySubspecificationName(subcategorySubspecificationDto.subcat_spec_id, subcategorySubspecificationDto.subcat_subspec_name.trim());
    if(ObjectUtils.isNotEmpty(subspecification)){
      throw new CategoryException(CategoryErrorConstant.DUPLICATE_SUBSPECIFICATION);
    }

    const user_id = String(req.user);

    subcategorySubspecificationDto = { ...subcategorySubspecificationDto, last_updated_on: new Date(), last_updated_by: user_id };
    const result = await this.subcategorySubspecificationRepository.update(id, subcategorySubspecificationDto);

    if (ObjectUtils.isEmpty(result)) {
      throw new CategoryException(CategoryErrorConstant.SPECIFICATION_NOT_FOUND);
    }

    return this.categoryMapper.mapSchemaToModel(result, SubcategorySubspecificationDto);
  }

  async deactivateSubcategorySubspecification(req: Request, id: string, is_active: boolean): Promise<SubcategorySubspecificationDto> {
    const result = await this.subcategorySubspecificationRepository.deactivateSubcategorySubspecificationById(req, id, is_active);

    if (ObjectUtils.isEmpty(result)) {
      throw new CategoryException(CategoryErrorConstant.SPECIFICATION_NOT_FOUND);
    }

    return this.categoryMapper.mapSchemaToModel(result, SubcategorySubspecificationDto);
  }

  async deleteSubcategorySubspecification(id: string): Promise<SubcategorySubspecificationDto> {
    const result = await this.subcategorySubspecificationRepository.delete(id);

    if (ObjectUtils.isEmpty(result)) {
      throw new CategoryException(CategoryErrorConstant.SPECIFICATION_NOT_FOUND);
    }

    return this.categoryMapper.mapSchemaToModel(result, SubcategorySubspecificationDto);
  }

}