export interface TransferOwnershipDto {
  newOwnerId: string;
  /**
   * User ID of the current owner initiating the transfer
   * Required for API key auth, ignored for JWT auth
   */
  userId?: string;
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
