import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { CONFIG_TABLAS } from '../../config/configTablas';
import { useInsertarMutation, useOpcionesFkQuery } from '../../api/queries';
import { NombreTabla } from '../../types/entidades';
import { CampoFormularioConfig } from '../../types/api';
import { AlertCircle, Plus } from 'lucide-react';

interface ModalInsertarProps {
  tabla: NombreTabla;
  isOpen: boolean;
  onClose: () => void;
  onGuardado?: (registro: Record<string, unknown>) => void;
  titulo?: string;
}

const VALOR_OTRO = '__nuevo__';

export const ModalInsertar: React.FC<ModalInsertarProps> = ({
  tabla,
  isOpen,
  onClose,
  onGuardado,
  titulo,
}) => {
  const queryClient = useQueryClient();
  const config = CONFIG_TABLAS[tabla];
  const formConfig = config.formulario;

  const { data: opcionesFkRes, isLoading: cargandoOpciones } = useOpcionesFkQuery(tabla, isOpen);

  const [valores, setValores] = useState<Record<string, unknown>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [modalAnidado, setModalAnidado] = useState<{ tabla: NombreTabla; campo: string } | null>(null);

  const mutation = useInsertarMutation(tabla);

  // Resetear formulario al abrir
  useEffect(() => {
    if (isOpen) {
      setValores({});
      setErrores({});
      setErrorGeneral(null);
      setModalAnidado(null);
    }
  }, [isOpen, tabla]);

  const opcionesPorCampo = useMemo(() => {
    return opcionesFkRes?.opciones || {};
  }, [opcionesFkRes]);

  const setValor = (key: string, value: unknown) => {
    setValores((prev) => ({ ...prev, [key]: value }));
    if (errores[key]) {
      setErrores((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validarCampo = (campo: CampoFormularioConfig, valor: unknown): string | null => {
    const str = valor === null || valor === undefined ? '' : String(valor).trim();

    if (campo.requerido && str === '') {
      return `El campo ${campo.label} es obligatorio`;
    }

    if (str !== '') {
      if (campo.tipo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
        return `El ${campo.label} no es válido`;
      }
      if (campo.tipo === 'number' && !/^\d+$/.test(str)) {
        return `El ${campo.label} debe ser numérico`;
      }
    }

    return null;
  };

  const validarTodo = (): Record<string, string> => {
    const nuevosErrores: Record<string, string> = {};
    for (const campo of formConfig.campos) {
      const error = validarCampo(campo, valores[campo.key]);
      if (error) {
        nuevosErrores[campo.key] = error;
      }
    }
    return nuevosErrores;
  };

  const construirDatosEnvio = (): Record<string, unknown> => {
    const datos: Record<string, unknown> = {};
    for (const campo of formConfig.campos) {
      const valor = valores[campo.key];
      if (valor === undefined || valor === null || String(valor).trim() === '') {
        continue;
      }
      if (campo.tipo === 'number') {
        datos[campo.key] = Number(valor);
      } else {
        datos[campo.key] = String(valor).trim();
      }
    }
    return datos;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGeneral(null);

    const nuevosErrores = validarTodo();
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    const datos = construirDatosEnvio();
    mutation.mutate(datos, {
      onSuccess: (res) => {
        onGuardado?.(res.data as Record<string, unknown>);
        onClose();
      },
      onError: (err: any) => {
        const mensaje = err?.response?.data?.error || err.message || 'Error al guardar';
        setErrorGeneral(mensaje);
      },
    });
  };

  const renderCampo = (campo: CampoFormularioConfig) => {
    const error = errores[campo.key];

    if (campo.fk) {
      const opciones = opcionesPorCampo[campo.key] || [];
      const selectOptions = opciones.map((opt) => ({
        label: opt.label || String(opt.value),
        value: String(opt.value),
      }));

      return (
        <div key={campo.key} className="space-y-1.5 text-left">
          <Select
            label={campo.label + (campo.requerido ? ' *' : '')}
            placeholderOption={`Seleccionar ${campo.label.toLowerCase()}...`}
            options={[...selectOptions, { label: '+ Otro...', value: VALOR_OTRO }]}
            value={String(valores[campo.key] || '')}
            onChange={(e) => {
              const value = e.target.value;
              if (value === VALOR_OTRO) {
                setModalAnidado({ tabla: campo.fk!.tabla, campo: campo.key });
              } else {
                setValor(campo.key, value || undefined);
              }
            }}
            disabled={cargandoOpciones}
          />
          {cargandoOpciones && <p className="text-[10px] text-slate-400">Cargando opciones...</p>}
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      );
    }

    if (campo.tipo === 'select') {
      return (
        <Select
          key={campo.key}
          label={campo.label + (campo.requerido ? ' *' : '')}
          placeholderOption={`Seleccionar ${campo.label.toLowerCase()}...`}
          options={campo.opciones || []}
          value={String(valores[campo.key] || '')}
          onChange={(e) => setValor(campo.key, e.target.value || undefined)}
        />
      );
    }

    if (campo.tipo === 'textarea') {
      return (
        <Textarea
          key={campo.key}
          label={campo.label + (campo.requerido ? ' *' : '')}
          placeholder={campo.placeholder}
          value={String(valores[campo.key] || '')}
          onChange={(e) => setValor(campo.key, e.target.value)}
          error={error}
        />
      );
    }

    return (
      <Input
        key={campo.key}
        type={campo.tipo}
        label={campo.label + (campo.requerido ? ' *' : '')}
        placeholder={campo.placeholder}
        value={String(valores[campo.key] || '')}
        onChange={(e) => setValor(campo.key, e.target.value)}
        error={error}
      />
    );
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={titulo || `Agregar ${config.titulo.toLowerCase()}`}
        description={`Completá los datos del nuevo ${config.titulo.toLowerCase().slice(0, -1)}`}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorGeneral && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorGeneral}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {formConfig.campos.map(renderCampo)}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-zinc-800">
            <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={mutation.isPending}>
              <Plus className="h-4 w-4" />
              <span>Guardar</span>
            </Button>
          </div>
        </form>
      </Dialog>

      {modalAnidado && (
        <ModalInsertar
          tabla={modalAnidado.tabla}
          isOpen={true}
          titulo={`Agregar ${CONFIG_TABLAS[modalAnidado.tabla].titulo.toLowerCase()}`}
          onClose={() => setModalAnidado(null)}
          onGuardado={(registro) => {
            const pk = CONFIG_TABLAS[modalAnidado.tabla].pk;
            setValor(modalAnidado.campo, registro[pk]);
            setModalAnidado(null);
            queryClient.invalidateQueries({ queryKey: ['fk-opciones', tabla] });
          }}
        />
      )}
    </>
  );
};
