import type { InputPort, OutputPort } from '../../../../shared/src/node-types';

export interface IndexedInputPort extends InputPort {
  index: number;
}

export interface IndexedOutputPort extends OutputPort {
  index: number;
}

export function indexInputPorts(ports: InputPort[]): IndexedInputPort[] {
  const indexes = new Map<string, number>();
  return ports.map((port) => {
    const index = indexes.get(port.type) ?? 0;
    indexes.set(port.type, index + 1);
    return { ...port, index };
  });
}

export function indexOutputPorts(ports: OutputPort[]): IndexedOutputPort[] {
  const indexes = new Map<string, number>();
  return ports.map((port) => {
    const index = indexes.get(port.type) ?? 0;
    indexes.set(port.type, index + 1);
    return { ...port, index };
  });
}

export function handleId(type: string, index: number): string {
  return `${type}:${index}`;
}
