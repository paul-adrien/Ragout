"use client";

export interface Constraints {
  ingredients: string;
  allergies: string;
  cuisineStyle: string;
  maxTime: string;
  level: string;
}

export const emptyConstraints: Constraints = {
  ingredients: "",
  allergies: "",
  cuisineStyle: "",
  maxTime: "",
  level: "",
};

interface ChatInputProps {
  readonly input: string;
  readonly onInputChange: (value: string) => void;
  readonly onSubmit: (e: React.FormEvent) => void;
  readonly loading: boolean;
  readonly lang: "fr" | "en";
  readonly onLangChange: (lang: "fr" | "en") => void;
  readonly constraints: Constraints;
  readonly onConstraintsChange: (constraints: Constraints) => void;
  readonly showConstraints: boolean;
  readonly onToggleConstraints: () => void;
}

export default function ChatInput({
  input,
  onInputChange,
  onSubmit,
  loading,
  lang,
  onLangChange,
  constraints,
  onConstraintsChange,
  showConstraints,
  onToggleConstraints,
}: ChatInputProps) {
  const hasConstraints = Object.values(constraints).some((v) => v.trim() !== "");

  return (
    <div className="shrink-0">
      {/* Contraintes culinaires */}
      {showConstraints && (
        <div className="border-t bg-gray-50 px-4 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Ingrédients dispo (séparés par virgule)"
              value={constraints.ingredients}
              onChange={(e) => onConstraintsChange({ ...constraints, ingredients: e.target.value })}
              className="border rounded px-2 py-1.5 text-sm"
            />
            <input
              type="text"
              placeholder="Allergies / restrictions"
              value={constraints.allergies}
              onChange={(e) => onConstraintsChange({ ...constraints, allergies: e.target.value })}
              className="border rounded px-2 py-1.5 text-sm"
            />
            <input
              type="text"
              placeholder="Style de cuisine (italien, asiatique...)"
              value={constraints.cuisineStyle}
              onChange={(e) => onConstraintsChange({ ...constraints, cuisineStyle: e.target.value })}
              className="border rounded px-2 py-1.5 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Temps max (min)"
                value={constraints.maxTime}
                onChange={(e) => onConstraintsChange({ ...constraints, maxTime: e.target.value })}
                className="border rounded px-2 py-1.5 text-sm w-32"
              />
              <select
                value={constraints.level}
                onChange={(e) => onConstraintsChange({ ...constraints, level: e.target.value })}
                className="border rounded px-2 py-1.5 text-sm flex-1 bg-white"
              >
                <option value="">Niveau</option>
                <option value="débutant">Débutant</option>
                <option value="intermédiaire">Intermédiaire</option>
                <option value="avancé">Avancé</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={onSubmit} className="border-t p-3 sm:p-4 flex gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onToggleConstraints}
          className={`shrink-0 px-3 py-2 border rounded-lg text-sm ${
            hasConstraints
              ? "bg-orange-100 text-orange-700 border-orange-300"
              : "text-gray-500 hover:bg-gray-100"
          }`}
          title="Contraintes culinaires"
        >
          ⚙
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Demandez une recette..."
          className="flex-1 min-w-0 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          disabled={loading}
        />
        <select
          value={lang}
          onChange={(e) => onLangChange(e.target.value as "fr" | "en")}
          className="shrink-0 border rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="fr">FR</option>
          <option value="en">EN</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "..." : "Envoyer"}
        </button>
      </form>
    </div>
  );
}
