export interface TransferOwnershipDto {
  newOwnerId: string;
}

export interface TransferOwnershipResponseDto {
  success: boolean;
  message: string;
  currentOwner?: {
    memberId: string;
    previousRoles: string[];
    newRoles: string[];
  };
  newOwner?: {
    memberId: string;
    previousRoles: string[];
    newRoles: string[];
  };
}
