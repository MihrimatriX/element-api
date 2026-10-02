/** Fields the landing API sample asks for; dot paths select nested properties. */
export const API_SAMPLE_FIELDS = ["symbol", "names.tr", "atomic_properties.atomic_mass"];

/** Request path shown (and copied) on the landing page. */
export const API_SAMPLE_PATH = `/api/v2/elements/fe?fields=${API_SAMPLE_FIELDS.join(",")}`;

/** The body the science API returns for API_SAMPLE_PATH; tests compare it with the data snapshot. */
export const API_SAMPLE_RESPONSE = {
  symbol: "Fe",
  names: { tr: "Demir" },
  atomic_properties: { atomic_mass: 55.845 },
};
