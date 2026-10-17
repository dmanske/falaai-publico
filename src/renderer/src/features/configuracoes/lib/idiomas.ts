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

export const IDIOMAS: { codigo: string; nome: string; bandeira: string }[] = [
  { codigo: "pt-BR", nome: "Português (Brasil)", bandeira: br },
  { codigo: "en", nome: "Inglês", bandeira: us },
  { codigo: "es", nome: "Espanhol", bandeira: es },
  { codigo: "fr", nome: "Francês", bandeira: fr },
  { codigo: "de", nome: "Alemão", bandeira: de },
  { codigo: "it", nome: "Italiano", bandeira: it },
  { codigo: "ja", nome: "Japonês", bandeira: jp },
  { codigo: "zh", nome: "Chinês", bandeira: cn },
  { codigo: "ko", nome: "Coreano", bandeira: kr },
  { codigo: "ru", nome: "Russo", bandeira: ru },
];
