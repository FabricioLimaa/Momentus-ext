export const CURRENT_TERMS_VERSION = 1;
export const TERMS_LAST_UPDATED_PT = '03 de Novembro de 2025';
export const TERMS_LAST_UPDATED_EN = 'November 03, 2025';

export type LegalLanguage = 'pt' | 'en';
export type LegalDocumentType = 'terms' | 'privacy' | 'license';

export interface LegalSubSection {
  subtitle: string;
  badge?: string;
  text?: string;
  bullets?: string[];
}

export interface LegalSection {
  badge: string;
  title: string;
  intro?: string;
  bullets?: string[];
  subsections?: LegalSubSection[];
  callout?: {
    type: 'info' | 'warning' | 'success';
    text: string;
  };
}

export interface LegalDocument {
  id: LegalDocumentType;
  title: string;
  subtitle: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
  conclusion?: string;
}

export const LEGAL_DOCUMENTS: Record<LegalLanguage, Record<LegalDocumentType, LegalDocument>> = {
  pt: {
    terms: {
      id: 'terms',
      title: 'Termos e Condições de Uso',
      subtitle: 'Diretrizes legais para utilização do ecossistema Momentus',
      lastUpdated: TERMS_LAST_UPDATED_PT,
      intro:
        'Estes Termos e Condições de Uso ("Termos") regem o seu acesso e uso do aplicativo Momentus ("Aplicativo"), desenvolvido por Fabricio Lima ("Autor"). Ao acessar ou usar o Aplicativo, você concorda expressamente em cumprir estes Termos.',
      sections: [
        {
          badge: '1.0',
          title: 'Termos para Usuários Finais',
          intro: 'Diretrizes e responsabilidades ao utilizar os recursos do aplicativo:',
          subsections: [
            {
              badge: '1.1',
              subtitle: 'Aceitação dos Termos',
              text: 'Ao criar uma conta ou usar o Aplicativo, você confirma que leu, entendeu e concorda em estar vinculado a estes Termos, à nossa Política de Privacidade e à nossa Licença de Uso.',
            },
            {
              badge: '1.2',
              subtitle: 'Uso do Aplicativo',
              text: 'O Aplicativo é fornecido a você "no estado em que se encontra". Você é o único responsável por todo o conteúdo que cria e gerencia através do Aplicativo e pelas consequências de suas ações. Você concorda em usar o Aplicativo apenas para fins lícitos.',
            },
            {
              badge: '1.3',
              subtitle: 'Conta de Usuário e Segurança',
              text: 'A segurança de sua conta é sua total responsabilidade. O Autor não se responsabiliza por perdas ou danos decorrentes de sua falha em proteger suas credenciais de acesso ou dispositivos.',
            },
            {
              badge: '1.4',
              subtitle: 'Propriedade Intelectual',
              text: 'Todos os direitos, títulos e interesses no Aplicativo, incluindo sua identidade visual, design, marca, logotipos, ilustrações e todo o código-fonte, são e continuarão sendo propriedade exclusiva de Fabricio Lima. Seu uso do Aplicativo não lhe concede nenhum direito sobre a propriedade intelectual do Autor.',
            },
            {
              badge: '1.5',
              subtitle: 'Rescisão e Encerramento',
              text: 'O Autor pode suspender ou encerrar seu acesso ao Aplicativo a qualquer momento, sem aviso prévio, por qualquer motivo legal cabível, incluindo, mas não se limitando a, violação destes Termos.',
            },
          ],
        },
        {
          badge: '2.0',
          title: 'Termos para Desenvolvedores (Restrições de Uso do Código)',
          intro: 'O código-fonte do Momentus é protegido por leis de direitos autorais e licença proprietária restrita.',
          callout: {
            type: 'warning',
            text: 'A visualização do código em repositórios públicos (GitHub) é permitida exclusivamente para fins educacionais e de avaliação profissional de portfólio.',
          },
          subsections: [
            {
              badge: '2.1',
              subtitle: 'Licença Proprietária e Restrita',
              text: 'O Aplicativo é um software proprietário. Todos os direitos não concedidos expressamente por escrito são formalmente reservados pelo Autor.',
            },
            {
              badge: '2.2',
              subtitle: 'Proibições Estritas',
              text: 'É expressa e estritamente proibido a qualquer pessoa, física ou jurídica, incluindo desenvolvedores:',
              bullets: [
                'Realizar engenharia reversa, descompilar, desmontar ou tentar descobrir o código-fonte do Aplicativo;',
                'Criar trabalhos derivados, modificar, adaptar ou traduzir qualquer parte do Aplicativo;',
                'Distribuir, vender, alugar, sublicenciar ou de qualquer outra forma transferir ou comercializar o Aplicativo ou seu código-fonte;',
                'Clonar, publicar ou redistribuir este aplicativo (ou cópias com alteração visual mínima) em lojas como Google Play Store ou Apple App Store;',
                'Monetizar o código direta ou indiretamente ou incorporá-lo em projetos comerciais de terceiros.',
              ],
            },
          ],
        },
        {
          badge: '3.0',
          title: 'Disposições Gerais e Foro',
          subsections: [
            {
              badge: '3.1',
              subtitle: 'Limitação de Responsabilidade',
              text: 'Na máxima extensão permitida pela legislação aplicável, o Autor não será responsável por quaisquer danos indiretos, incidentais, especiais, consequenciais ou punitivos resultantes do seu acesso, uso ou incapacidade de usar o Aplicativo.',
            },
            {
              badge: '3.2',
              subtitle: 'Legislação Aplicável e Jurisdição',
              text: 'Estes Termos serão regidos e interpretados de acordo com as leis da República Federativa do Brasil. Quaisquer disputas serão resolvidas nos tribunais da comarca de residência do Autor.',
            },
            {
              badge: '3.3',
              subtitle: 'Alterações e Atualizações dos Termos',
              text: 'O Autor reserva-se o direito de modificar estes Termos a qualquer momento. Modificações substanciais serão apresentadas no aplicativo com solicitação de novo aceite do usuário para acesso continuado.',
            },
          ],
        },
      ],
      conclusion: 'Ao continuar no Momentus, você declara total ciência e conformidade com estes termos.',
    },
    privacy: {
      id: 'privacy',
      title: 'Política de Privacidade',
      subtitle: 'Compromisso com sua segurança e conformidade com a LGPD (Lei Nº 13.709/2018)',
      lastUpdated: TERMS_LAST_UPDATED_PT,
      intro:
        'Esta Política de Privacidade descreve como o aplicativo Momentus ("nós", "nosso" ou "o aplicativo"), desenvolvido por Fabricio Lima, coleta, utiliza e protege suas informações quando você utiliza nosso serviço.',
      sections: [
        {
          badge: '1.0',
          title: 'Controlador dos Dados',
          intro: 'O controlador dos seus dados pessoais no âmbito deste aplicativo é Fabricio Lima.',
          callout: {
            type: 'info',
            text: 'Canal oficial do Encarregado de Dados (DPO): contato@momentusapp.com.br',
          },
        },
        {
          badge: '2.0',
          title: 'Categorias de Dados que Coletamos',
          subsections: [
            {
              badge: '2.1',
              subtitle: 'Dados Fornecidos por Você (Conta)',
              bullets: [
                'Informações de Autenticação: Ao se autenticar com Google, Apple ou e-mail/senha, coletamos nome completo, endereço de e-mail e foto de perfil.',
                'Credenciais são processadas diretamente via Firebase Authentication com criptografia padrão da indústria.',
              ],
            },
            {
              badge: '2.2',
              subtitle: 'Dados Gerados Durante o Uso do Aplicativo',
              bullets: [
                'Suas Rotinas e Eventos: Títulos, descrições, horários de início e término, categorias personalizadas e templates de rotina.',
                'Gamificação e Progresso: Pontos acumulados (XP), conquistas desbloqueadas, tempo de foco e sequência diária de uso (streak).',
              ],
            },
            {
              badge: '2.3',
              subtitle: 'Integrações Opcionais de Terceiros',
              bullets: [
                'Google Calendar: Apenas quando expressamente autorizado por você, acessamos sua agenda para exibir eventos e sincronizar horários sem duplicidade.',
              ],
            },
          ],
        },
        {
          badge: '3.0',
          title: 'Como Usamos Seus Dados',
          intro: 'A finalidade do tratamento é estritamente operacional e de utilidade pessoal:',
          bullets: [
            'Fornecer a funcionalidade principal: autenticação, agendamento de rotinas, lembretes pontuais e visualização em calendário;',
            'Sincronização na Nuvem: manter suas rotinas salvas e atualizadas entre seus dispositivos via Cloud Firestore;',
            'Integração com Agenda Google: ler e criar eventos autorizados por você;',
            'Segurança da Informação: garantir a integridade dos dados e proteção contra fraudes.',
          ],
        },
        {
          badge: '4.0',
          title: 'Compartilhamento e Armazenamento Seguro',
          callout: {
            type: 'success',
            text: 'NUNCA vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins publicitários ou comerciais.',
          },
          intro: 'Seus dados são transmitidos e armazenados exclusivamente nos seguintes servidores:',
          bullets: [
            'Google Firebase / Cloud Firestore: infraestrutura global do Google com criptografia em repouso e em trânsito;',
            'Armazenamento Local Seguro: banco de dados SQLite local criptografado e isolado em seu dispositivo.',
          ],
        },
        {
          badge: '5.0',
          title: 'Seus Direitos como Titular dos Dados (LGPD)',
          intro: 'Em conformidade com a LGPD (Lei Nº 13.709/2018), você possui o direito pleno de:',
          bullets: [
            'Confirmar a existência de tratamento e acessar seus dados pessoais;',
            'Corrigir dados incompletos, inexatos ou desatualizados;',
            'Eliminar todos os seus dados armazenados (basta utilizar a opção "Excluir Conta" nas Configurações ou solicitar via e-mail);',
            'Exportar uma cópia de segurança completa de todas as suas rotinas através da ferramenta de Backup no app.',
          ],
        },
        {
          badge: '6.0',
          title: 'Atualizações desta Política',
          intro: 'Podemos atualizar esta política periodicamente. Notificaremos sobre alterações através do próprio aplicativo.',
        },
      ],
      conclusion: 'Dúvidas ou solicitações sobre privacidade: entre em contato em contato@momentusapp.com.br.',
    },
    license: {
      id: 'license',
      title: 'Licença de Software Proprietário',
      subtitle: 'Contrato de Licenciamento de Uso do Software Momentus',
      lastUpdated: TERMS_LAST_UPDATED_PT,
      intro:
        'Copyright (c) 2025 Fabricio Lima. Todos os Direitos Reservados.\n\nEste software e seu código-fonte são propriedade intelectual de Fabricio Lima e são rigorosamente protegidos pela Lei de Direitos Autorais do Brasil (Lei Nº 9.610 de 19 de fevereiro de 1998), bem como por convenções internacionais de direitos autorais, incluindo a Convenção de Berna.',
      sections: [
        {
          badge: '1.0',
          title: 'Concessão de Licença Restrita ao Usuário',
          intro:
            'É concedida ao usuário final uma licença pessoal, não exclusiva, intransferível, não sublicenciável e revogável para baixar, instalar e utilizar o aplicativo Momentus em seus dispositivos compatíveis, estritamente para uso pessoal e não comercial.',
        },
        {
          badge: '2.0',
          title: 'Restrições Expressas e Infrações',
          intro: 'É expressamente proibido, sem autorização prévia e por escrito do autor:',
          bullets: [
            'Usar, copiar, modificar, mesclar, publicar, distribuir, sublicenciar e/ou vender cópias deste software ou de qualquer parte dele;',
            'Extrair partes do código-fonte ou ativos de arte para uso em softwares concorrentes ou terceiros;',
            'Qualquer uso não autorizado constitui violação criminal e civil da lei de direitos autorais e sujeitará os infratores às sanções cabíveis.',
          ],
        },
        {
          badge: '3.0',
          title: 'Isenção Completa de Garantias',
          callout: {
            type: 'warning',
            text: 'ESTE SOFTWARE É FORNECIDO "NO ESTADO EM QUE SE ENCONTRA", SEM GARANTIA DE QUALQUER TIPO, EXPRESSA OU IMPLÍCITA, INCLUINDO GARANTIAS DE COMERCIALIZAÇÃO OU ADEQUAÇÃO A UM FIM ESPECÍFICO.',
          },
          intro:
            'EM NENHUMA CIRCUNSTÂNCIA O AUTOR SERÁ RESPONSÁVEL POR QUALQUER REIVINDICAÇÃO, DANOS OU OUTRA RESPONSABILIDADE, SEJA EM AÇÃO DE CONTRATO OU DELITO, DECORRENTE DO USO OU DE OUTRAS NEGOCIAÇÕES NO SOFTWARE.',
        },
      ],
      conclusion: 'Fabricio Lima • Desenvolvedor & Autor Proprietário.',
    },
  },
  en: {
    terms: {
      id: 'terms',
      title: 'Terms and Conditions of Use',
      subtitle: 'Legal guidelines for accessing and using the Momentus ecosystem',
      lastUpdated: TERMS_LAST_UPDATED_EN,
      intro:
        'These Terms and Conditions of Use ("Terms") govern your access to and use of the Momentus application ("App"), developed by Fabricio Lima ("Author"). By accessing or using the App, you expressly agree to be bound by these Terms.',
      sections: [
        {
          badge: '1.0',
          title: 'Terms for End-Users',
          intro: 'Guidelines and responsibilities when using the application features:',
          subsections: [
            {
              badge: '1.1',
              subtitle: 'Acceptance of Terms',
              text: 'By creating an account or using the App, you confirm that you have read, understood, and agree to be bound by these Terms, our Privacy Policy, and our License Agreement.',
            },
            {
              badge: '1.2',
              subtitle: 'Use of the App',
              text: 'The App is provided to you "as is". You are solely responsible for all content you create and manage through the App and for the consequences of your actions. You agree to use the App only for lawful purposes.',
            },
            {
              badge: '1.3',
              subtitle: 'User Account Security',
              text: 'The security of your account is your sole responsibility. The Author is not liable for any loss or damage arising from your failure to protect your access credentials or devices.',
            },
            {
              badge: '1.4',
              subtitle: 'Intellectual Property',
              text: 'All rights, titles, and interests in and to the App, including its visual identity, design, brand, logos, graphics, and all source code, are and will remain the exclusive property of Fabricio Lima. Your use does not grant any ownership rights.',
            },
            {
              badge: '1.5',
              subtitle: 'Termination',
              text: 'The Author may suspend or terminate your access to the App at any time, without prior notice, for any lawful reason, including a breach of these Terms.',
            },
          ],
        },
        {
          badge: '2.0',
          title: 'Terms for Developers (Code Usage Restrictions)',
          intro: 'The Momentus source code is protected under copyright law and a strict proprietary license.',
          callout: {
            type: 'warning',
            text: 'Viewing source code on public repositories (GitHub) is allowed solely for educational review and professional portfolio evaluation.',
          },
          subsections: [
            {
              badge: '2.1',
              subtitle: 'Proprietary and Restricted License',
              text: 'The App is proprietary software. All rights not expressly granted in writing are strictly reserved by the Author.',
            },
            {
              badge: '2.2',
              subtitle: 'Strict Prohibitions',
              text: 'It is strictly forbidden for anyone, individual or entity, including developers, to:',
              bullets: [
                'Reverse engineer, decompile, disassemble, or attempt to discover the source code of the App;',
                'Create derivative works, modify, adapt, or translate any part of the App;',
                'Distribute, sell, rent, sublicense, transfer, or commercialize the App or its source code;',
                'Clone, publish, or redistribute this app on app stores such as Google Play Store or Apple App Store;',
                'Monetize the code directly or indirectly without prior written authorization.',
              ],
            },
          ],
        },
        {
          badge: '3.0',
          title: 'General Provisions & Jurisdiction',
          subsections: [
            {
              badge: '3.1',
              subtitle: 'Limitation of Liability',
              text: 'To the maximum extent permitted by applicable law, the Author shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the App.',
            },
            {
              badge: '3.2',
              subtitle: 'Governing Law',
              text: 'These Terms shall be governed by and construed in accordance with the laws of the Federative Republic of Brazil.',
            },
            {
              badge: '3.3',
              subtitle: 'Changes to Terms',
              text: 'The Author reserves the right to modify these Terms at any time. Major updates will require renewed user consent within the app for continued access.',
            },
          ],
        },
      ],
      conclusion: 'By continuing to use Momentus, you acknowledge and agree to these terms.',
    },
    privacy: {
      id: 'privacy',
      title: 'Privacy Policy',
      subtitle: 'Commitment to data security and international privacy standards (LGPD/GDPR)',
      lastUpdated: TERMS_LAST_UPDATED_EN,
      intro:
        'This Privacy Policy describes how the Momentus application ("we", "us", "our", or "the app"), developed by Fabricio Lima, collects, uses, and protects your information when you use our service.',
      sections: [
        {
          badge: '1.0',
          title: 'Data Controller',
          intro: 'The controller of your personal data within this application is Fabricio Lima.',
          callout: {
            type: 'info',
            text: 'Official Data Protection contact: contato@momentusapp.com.br',
          },
        },
        {
          badge: '2.0',
          title: 'Data Categories We Collect',
          subsections: [
            {
              badge: '2.1',
              subtitle: 'Data Provided by You (Account)',
              bullets: [
                'Authentication Info: When signing in with Google, Apple, or email/password, we collect your display name, email address, and profile picture.',
                'Credentials are secure and handled directly by Firebase Authentication with industry-standard encryption.',
              ],
            },
            {
              badge: '2.2',
              subtitle: 'Data Generated While Using the App',
              bullets: [
                'Your Routines and Events: Titles, descriptions, start and end times, custom categories, and routine templates.',
                'Gamification Metrics: Accumulated XP points, unlocked badges, focus timer minutes, and daily streak counts.',
              ],
            },
            {
              badge: '2.3',
              subtitle: 'Optional Third-Party Integrations',
              bullets: [
                'Google Calendar: Only with your explicit permission, we access your calendar to display events and schedule items without duplicates.',
              ],
            },
          ],
        },
        {
          badge: '3.0',
          title: 'How We Use Your Data',
          intro: 'The purpose of data processing is strictly functional and personal productivity:',
          bullets: [
            'Providing core features: authentication, routine scheduling, timely notifications, and calendar views;',
            'Cloud Synchronization: keeping your routines updated across your devices via Cloud Firestore;',
            'Google Calendar Integration: reading and creating events per your request;',
            'Security & Reliability: protecting your account and data integrity.',
          ],
        },
        {
          badge: '4.0',
          title: 'Data Sharing & Storage',
          callout: {
            type: 'success',
            text: 'We DO NOT sell, rent, or share your personal data with third parties for marketing purposes.',
          },
          intro: 'Your data is handled securely within trusted infrastructure:',
          bullets: [
            'Google Firebase / Cloud Firestore: enterprise-grade cloud with encryption at rest and in transit;',
            'Encrypted Local Storage: local SQLite database isolated safely on your device.',
          ],
        },
        {
          badge: '5.0',
          title: 'Your Privacy Rights',
          intro: 'You have comprehensive privacy rights:',
          bullets: [
            'Access, confirm, and verify your personal data;',
            'Correct incomplete or inaccurate information;',
            'Delete all your data (by using the "Delete Account" button in Settings or contacting support);',
            'Export a full JSON backup of all your routines anytime.',
          ],
        },
        {
          badge: '6.0',
          title: 'Policy Updates',
          intro: 'We may update this policy periodically. We will notify you of any changes directly within the app.',
        },
      ],
      conclusion: 'Questions regarding privacy: reach out to contato@momentusapp.com.br.',
    },
    license: {
      id: 'license',
      title: 'Proprietary Software License',
      subtitle: 'End-User License Agreement (EULA) for Momentus',
      lastUpdated: TERMS_LAST_UPDATED_EN,
      intro:
        'Copyright (c) 2025 Fabricio Lima. All Rights Reserved.\n\nThis software and its source code are the intellectual property of Fabricio Lima and are strictly protected by Brazilian Copyright Law (Law No. 9.610 of February 19, 1998), as well as international copyright treaties including the Berne Convention.',
      sections: [
        {
          badge: '1.0',
          title: 'Grant of Restricted License',
          intro:
            'The end-user is granted a personal, non-exclusive, non-transferable, non-sublicensable, revocable license to download, install, and run the Momentus application solely for personal, non-commercial productivity purposes.',
        },
        {
          badge: '2.0',
          title: 'Explicit Restrictions',
          intro: 'Without prior written authorization from the author, you may not:',
          bullets: [
            'Use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of this software or any portion thereof;',
            'Extract source code, algorithms, or visual assets for use in competing products;',
            'Any unauthorized use constitutes severe copyright infringement subject to applicable legal penalties.',
          ],
        },
        {
          badge: '3.0',
          title: 'Disclaimer of Warranties',
          callout: {
            type: 'warning',
            text: 'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.',
          },
          intro:
            'IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE.',
        },
      ],
      conclusion: 'Fabricio Lima • Author & Copyright Holder.',
    },
  },
};
