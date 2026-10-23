// Route d'API de la fixture « dépôt existant » : adopt.mjs doit y voir un composant du conteneur web,
// et non un conteneur à part (les routes d'API Next.js sont déployées avec l'application).
// Ce fichier doit rester versionné : un dossier vide ne traverse pas un clone, et le test d'adoption
// échouerait alors sur toute machine qui n'est pas celle de l'auteur.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ notifications: [] });
}
