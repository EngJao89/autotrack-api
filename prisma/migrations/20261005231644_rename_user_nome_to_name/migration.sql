/*
  Rename User.nome -> User.name to align with the public API contract.
*/
ALTER TABLE "User" RENAME COLUMN "nome" TO "name";
