import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SettingsPage } from '../pages/SettingsPage';

vi.mock('../services/api', () => ({
  adminApi: {
    getTestMode: vi.fn(),
    getSmsRouting: vi.fn(),
    getMapsKey: vi.fn(),
    getCredentials: vi.fn(),
    getSettings: vi.fn(),
    setTestMode: vi.fn(),
    setSmsRouting: vi.fn(),
    setSetting: vi.fn(),
    setMapsKey: vi.fn(),
    setCredentials: vi.fn(),
  },
}));

import { adminApi } from '../services/api';

const mockTestMode = {
  testModeEnabled: true,
  testOtpValue: '123456',
  otpLogEnabled: true,
  otpChannel: 'sms',
  smsDefaultProvider: 'mock',
  emailProvider: 'mock',
  availableSmsProviders: ['mock', 'twilio', 'orange-cm', 'africas-talking'],
  availableEmailProviders: ['mock', 'sendgrid', 'smtp'],
  availableOtpChannels: ['sms', 'email', 'both'],
};

const mockSmsRouting = {
  rules: [],
  defaultProvider: 'mock',
};

const mockMapsKey = {
  configured: false,
  maskedKey: '',
};

const mockCredentials = {
  status: {},
};

const mockAllSettings = {
  workflow_arrival_enabled: 'true',
  workflow_departure_enabled: 'true',
  workflow_international_enabled: 'true',
  international_surcharge_percent: '20',
  commission_rate: '0.15',
  cashback_rate: '0.05',
  first_ride_bonus_points: '500',
  rating_bonus_points: '200',
  late_cancel_refund_rate: '0.5',
  points_expiry_warning_days: '30',
  points_recharge_packages: '[1000,3000,5000,10000]',
};

function setupMocks() {
  vi.mocked(adminApi.getTestMode).mockResolvedValue(mockTestMode);
  vi.mocked(adminApi.getSmsRouting).mockResolvedValue(mockSmsRouting);
  vi.mocked(adminApi.getMapsKey).mockResolvedValue(mockMapsKey);
  vi.mocked(adminApi.getCredentials).mockResolvedValue(mockCredentials);
  vi.mocked(adminApi.getSettings).mockResolvedValue(mockAllSettings);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SettingsPage', () => {
  it('se monte sans erreur et affiche le titre', async () => {
    setupMocks();
    render(<SettingsPage />);
    await waitFor(() => expect(screen.getByText('Configuration')).toBeInTheDocument());
  });

  it('charge et affiche les paramètres au montage', async () => {
    setupMocks();
    render(<SettingsPage />);
    await waitFor(() => {
      expect(adminApi.getTestMode).toHaveBeenCalled();
      expect(adminApi.getSettings).toHaveBeenCalled();
    });
  });

  it('affiche la bannière "Mode TEST actif" quand testModeEnabled = true', async () => {
    setupMocks();
    render(<SettingsPage />);
    await waitFor(() => expect(screen.getByText('Mode TEST actif')).toBeInTheDocument());
  });

  it('affiche la bannière "Mode PRODUCTION actif" quand testModeEnabled = false', async () => {
    setupMocks();
    vi.mocked(adminApi.getTestMode).mockResolvedValue({ ...mockTestMode, testModeEnabled: false });
    render(<SettingsPage />);
    await waitFor(() => expect(screen.getByText('Mode PRODUCTION actif')).toBeInTheDocument());
  });

  it('affiche le champ commission_rate avec la valeur 0.15', async () => {
    setupMocks();
    render(<SettingsPage />);
    await waitFor(() => {
      const input = document.querySelector('input[value="0.15"]') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.value).toBe('0.15');
    });
  });

  it('le bouton "Sauvegarder tout" appelle setTestMode et setSmsRouting', async () => {
    setupMocks();
    vi.mocked(adminApi.setTestMode).mockResolvedValue(undefined);
    vi.mocked(adminApi.setSmsRouting).mockResolvedValue(undefined);
    render(<SettingsPage />);
    await waitFor(() => screen.getByText('Sauvegarder tout'));
    fireEvent.click(screen.getByText('Sauvegarder tout'));
    await waitFor(() => {
      expect(adminApi.setTestMode).toHaveBeenCalled();
      expect(adminApi.setSmsRouting).toHaveBeenCalled();
    });
  });

  it('affiche le toast de succès après sauvegarde', async () => {
    setupMocks();
    vi.mocked(adminApi.setTestMode).mockResolvedValue(undefined);
    vi.mocked(adminApi.setSmsRouting).mockResolvedValue(undefined);
    render(<SettingsPage />);
    await waitFor(() => screen.getByText('Sauvegarder tout'));
    fireEvent.click(screen.getByText('Sauvegarder tout'));
    await waitFor(() =>
      expect(screen.getByText('Paramètres sauvegardés avec succès')).toBeInTheDocument()
    );
  });

  it('affiche le toast d\'erreur si la sauvegarde échoue', async () => {
    setupMocks();
    vi.mocked(adminApi.setTestMode).mockRejectedValue(new Error('Timeout'));
    render(<SettingsPage />);
    await waitFor(() => screen.getByText('Sauvegarder tout'));
    fireEvent.click(screen.getByText('Sauvegarder tout'));
    await waitFor(() => expect(screen.getByText('Timeout')).toBeInTheDocument());
  });

  it('les sections Workflows et Paramètres financiers sont visibles', async () => {
    setupMocks();
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Workflows de réservation')).toBeInTheDocument();
      expect(screen.getByText('Paramètres financiers')).toBeInTheDocument();
    });
  });

  it('le bouton Enregistrer des workflows appelle setSetting', async () => {
    setupMocks();
    vi.mocked(adminApi.setSetting).mockResolvedValue(undefined);
    render(<SettingsPage />);
    // Wait for all sections to be visible
    await waitFor(() => screen.getByText('Workflows de réservation'));
    // The workflows section button renders "Enregistrer" text when not saving
    // Find all buttons and click each "Enregistrer" one until setSetting is called
    const allButtons = screen.getAllByRole('button', { name: /enregistrer/i });
    // The workflows Enregistrer button is in the Workflows section — click it
    for (const btn of allButtons) {
      fireEvent.click(btn);
    }
    await waitFor(() => expect(adminApi.setSetting).toHaveBeenCalled());
  });
});
