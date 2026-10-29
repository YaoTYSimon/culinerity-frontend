/** The quiet food-setup notes under a swap or a recipe: kitchen fit, check the ingredients, certified meat. */
export interface FitNote {
  fit: 'fits' | 'check';
  kitchen: boolean;
  certifiedMeat: 'halal' | 'kosher' | null;
}

export function FoodFitNotes({ note }: { note: FitNote }) {
  return (
    <>
      {(note.kitchen || note.fit === 'check') && (
        <div className="mt-1.5 text-sm font-semibold">
          {note.kitchen && note.fit === 'check' && <p className="font-normal text-muted">Your food</p>}
          {note.kitchen && <p>Fits your kitchen</p>}
          {note.fit === 'check' && <p>Check the ingredients</p>}
        </div>
      )}
      {note.certifiedMeat && <p className="mt-0.5 text-sm text-muted">Use {note.certifiedMeat}-certified meat.</p>}
    </>
  );
}
