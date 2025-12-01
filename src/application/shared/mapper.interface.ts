/**
 * Interface for mapping between domain entities and DTOs.
 */
interface Mapper<TDomain, TDto> {
  toDTO(domain: TDomain): TDto
  toDomain(dto: TDto): TDomain
}

export type { Mapper }
