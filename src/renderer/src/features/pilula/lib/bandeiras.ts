// Bandeira de cada sigla de idioma mostrada na pílula (a sigla vem de siglaIdioma, em @shared/config).
import br from "@/assets/bandeiras/br.svg";
import cn from "@/assets/bandeiras/cn.svg";
import de from "@/assets/bandeiras/de.svg";
import es from "@/assets/bandeiras/es.svg";
import fr from "@/assets/bandeiras/fr.svg";
import it from "@/assets/bandeiras/it.svg";
import jp from "@/assets/bandeiras/jp.svg";
import kr from "@/assets/bandeiras/kr.svg";
import ru from "@/assets/bandeiras/ru.svg";
import us from "@/assets/bandeiras/us.svg";

const POR_SIGLA: Record<string, string> = { PT: br, EN: us, ES: es, FR: fr, DE: de, IT: it, JA: jp, ZH: cn, KO: kr, RU: ru };

/** URL da bandeira da sigla ("EN" → EUA), ou undefined se não houver. */
export const bandeiraDaSigla = (sigla: string): string | undefined => POR_SIGLA[sigla.toUpperCase()];
