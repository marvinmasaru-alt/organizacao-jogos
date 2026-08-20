import { Injectable } from '@nestjs/common';
import { SedesService } from '../sedes/sedes.service';
import { VagasService } from '../vagas/vagas.service';

/**
 * Read model do Board principal: resume, por sede, tipo, "X/Y" e
 * "✓ Completo" / "N vagas disponíveis" para uma data (padrão = hoje).
 * Não expõe nomes de funcionários com falta (ver FaltasModule para isso).
 */
@Injectable()
export class BoardService {
  constructor(
    private readonly sedesService: SedesService,
    private readonly vagasService: VagasService,
  ) {}

  async resumoPorData(data: string) {
    const vagasDoDia = await this.vagasService.listarPorData(data);
    const vagasComDisponibilidade =
      await this.vagasService.calcularDisponibilidade(vagasDoDia);

    // TODO: agrupar vagasComDisponibilidade por sede e montar o resumo
    // (X/Y, ✓ Completo, N vagas disponíveis) que o board consome.
    void this.sedesService;
    return vagasComDisponibilidade;
  }
}
