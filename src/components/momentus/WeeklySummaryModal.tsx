
import React, { useState, useRef, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { captureRef } from "react-native-view-shot";
import {
  MomentusColors,
  BorderRadiusTokens,
  getContrastTextColor,
} from "@/constants/theme";
import { UserLevelInfo } from "@/domain/userLevel";
import { UserProfile } from "@/types";

export interface WeeklySummaryStats {
  perfectDaysCount: number;
  totalDaysWithHabits: number;
  currentCount: number;
  focusFormatted: string;
  bestCategory: string;
  bestCategoryColor?: string;
  improvement: number;
  dailyAverage: string;
}

interface WeeklySummaryModalProps {
  visible: boolean;
  onClose: () => void;
  stats: WeeklySummaryStats;
  userProfile?: UserProfile | null;
  userLevel?: UserLevelInfo | null;
  primaryColor?: string;
}

export const WeeklySummaryModal: React.FC<WeeklySummaryModalProps> = ({
  visible,
  onClose,
  stats,
  userProfile,
  userLevel,
  primaryColor = MomentusColors.emeraldNeon,
}) => {
  const cardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const screenWidth = Dimensions.get("window").width;
  const cardWidth = Math.min(screenWidth - 48, 330);
  const cardHeight = Math.round(cardWidth * (16 / 9));

  // Frase inspiracional calculada dinamicamente conforme o desempenho
  const motivationalQuote = useMemo(() => {
    if (stats.perfectDaysCount >= 5) {
      return "Consistência de elite! Você transformou intenção em resultado com maestria.";
    }
    if (stats.currentCount >= 14) {
      return "Ritmo constante e evolução diária. Continue construindo sua melhor versão!";
    }
    if (stats.currentCount > 0) {
      return "Cada rotina concluída é um passo firme rumo aos seus grandes objetivos.";
    }
    return "Uma nova semana é uma tela em branco pronta para suas maiores vitórias.";
  }, [stats.perfectDaysCount, stats.currentCount]);

  const userName = userProfile?.name?.trim() || "Você";
  const userInitial = userName.charAt(0).toUpperCase();
  const userPhoto = userProfile?.photoUrl || null;
  const rankTitle = userLevel
    ? `Nível ${userLevel.level} • ${userLevel.rankName}`
    : "Produtivo";
  const rankColor = userLevel?.rankColor || MomentusColors.gold;

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
  };

  const handleShare = async () => {
    triggerHaptic();
    if (!cardRef.current) return;

    try {
      setIsSharing(true);

      if (Platform.OS === "web") {
        // Captura no ambiente Web garantindo fundo escuro sem bordas brancas
        const dataUri = await captureRef(cardRef, {
          format: "png",
          quality: 1.0,
          result: "data-uri",
        });

        // Tenta Web Share API se suportar arquivos
        let sharedViaApi = false;
        if (typeof navigator !== "undefined" && navigator.share) {
          try {
            const res = await fetch(dataUri);
            const blob = await res.blob();
            const file = new File([blob], "resumo-momentus-stories.png", {
              type: "image/png",
            });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: "Meu Resumo Semanal no Momentus",
                text: "Confira meu progresso e consistência no Momentus!",
              });
              sharedViaApi = true;
            }
          } catch {
            sharedViaApi = false;
          }
        }

        // Se Web Share não estiver disponível ou falhar, faz download do PNG diretamente
        if (!sharedViaApi && typeof document !== "undefined") {
          const downloadLink = document.createElement("a");
          downloadLink.href = dataUri;
          downloadLink.download = "resumo-momentus-stories.png";
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          Alert.alert(
            "Imagem Baixada!",
            "Seu cartão de Stories foi salvo sem bordas. Você já pode publicar no Instagram, WhatsApp ou onde desejar!",
          );
        }
      } else {
        // Mobile nativo (Android e iOS): gera arquivo PNG limpo e abre folha nativa
        const uri = await captureRef(cardRef, {
          format: "png",
          quality: 1.0,
        });

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: "Compartilhar Resumo Semanal",
            UTI: "public.png",
          });
        } else {
          Alert.alert(
            "Atenção",
            "O compartilhamento nativo não está disponível neste dispositivo.",
          );
        }
      }
    } catch (err: any) {
      console.warn("Erro ao compartilhar resumo:", err);
      Alert.alert(
        "Erro",
        "Não foi possível gerar a imagem para compartilhamento.",
      );
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <ScrollView
          contentContainerStyle={styles.scrollWrapper}
          showsVerticalScrollIndicator={false}
        >
          {/* Header de Ações do Modal */}
          <View style={[styles.modalTopBar, { maxWidth: cardWidth + 24 }]}>
            <View style={styles.modalTitleRow}>
              <Ionicons name="sparkles" size={18} color={primaryColor} />
              <Text style={styles.modalTopBarTitle}>Stories 9:16</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Fechar resumo semanal"
            >
              <Ionicons name="close" size={22} color="#CBD5E1" />
            </TouchableOpacity>
          </View>

          {/* Wrapper com sombra para exibição em tela sem sangramento na captura */}
          <View
            style={[
              styles.cardShadowWrapper,
              { width: cardWidth, height: cardHeight },
            ]}
          >
            {/* Cartão de Stories Proporção 9:16 (Área Estrita Capturada) */}
            <View
              ref={cardRef}
              collapsable={false}
              style={[
                styles.cardContainer,
                {
                  width: cardWidth,
                  height: cardHeight,
                },
              ]}
            >
              <LinearGradient
                colors={["#070B18", "#0F172A", "#050811"]}
                start={{ x: 0.1, y: 0.0 }}
                end={{ x: 0.9, y: 1.0 }}
                style={styles.cardGradient}
              >
                {/* Efeito Glow Ambiente no Topo */}
                <View
                  style={[
                    styles.ambientGlow,
                    {
                      backgroundColor: primaryColor,
                    },
                  ]}
                />

                {/* Topo do Cartão: Badge de Marca */}
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.brandPill,
                      { borderColor: `${primaryColor}40` },
                    ]}
                  >
                    <Ionicons name="flash" size={11} color={primaryColor} />
                    <Text style={[styles.brandText, { color: primaryColor }]}>
                      MOMENTUS
                    </Text>
                    <View style={styles.brandDot} />
                    <Text style={styles.brandSub}>STORIES</Text>
                  </View>
                </View>

                {/* Perfil & Nível com Foto do Usuário se Disponível */}
                <View style={styles.profileSection}>
                  <View
                    style={[styles.avatarCircle, { borderColor: primaryColor }]}
                  >
                    {userPhoto && !avatarError ? (
                      <Image
                        source={{ uri: userPhoto }}
                        style={styles.avatarImage}
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <Text style={styles.avatarInitial}>{userInitial}</Text>
                    )}
                  </View>
                  <View style={styles.profileInfo}>
                    <Text numberOfLines={1} style={styles.profileName}>
                      {userName}
                    </Text>
                    <View
                      style={[
                        styles.rankBadge,
                        { backgroundColor: `${rankColor}20` },
                      ]}
                    >
                      <Ionicons name="trophy" size={11} color={rankColor} />
                      <Text style={[styles.rankText, { color: rankColor }]}>
                        {rankTitle}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Destaque Central: Dias Perfeitos (Hero Metric) */}
                <View style={styles.heroCard}>
                  <LinearGradient
                    colors={[
                      "rgba(255, 255, 255, 0.07)",
                      "rgba(255, 255, 255, 0.02)",
                    ]}
                    style={styles.heroCardGradient}
                  >
                    <View style={styles.heroHeaderRow}>
                      <View style={styles.heroIconBox}>
                        <Ionicons
                          name="flame"
                          size={22}
                          color={MomentusColors.gold}
                        />
                      </View>
                      <View style={styles.heroTextBox}>
                        <Text style={styles.heroLabel}>DIAS PERFEITOS</Text>
                        <Text style={styles.heroSubLabel}>
                          100% dos hábitos concluídos
                        </Text>
                      </View>
                    </View>

                    <View style={styles.heroScoreRow}>
                      <Text
                        style={[
                          styles.heroScoreNumber,
                          { color: primaryColor },
                        ]}
                      >
                        {stats.perfectDaysCount}
                      </Text>
                      <Text style={styles.heroScoreTotal}>
                        / {stats.totalDaysWithHabits || 7} dias
                      </Text>
                    </View>
                  </LinearGradient>
                </View>

                {/* Grid 2x2 de Métricas Complementares */}
                <View style={styles.metricsGrid}>
                  {/* 1: Hábitos Feitos */}
                  <View style={styles.metricTile}>
                    <Ionicons
                      name="checkmark-done-circle"
                      size={17}
                      color={primaryColor}
                    />
                    <Text style={styles.metricValue}>{stats.currentCount}</Text>
                    <Text style={styles.metricLabel}>Hábitos Feitos</Text>
                  </View>

                  {/* 2: Tempo Focado */}
                  <View style={styles.metricTile}>
                    <Ionicons
                      name="timer-outline"
                      size={17}
                      color={MomentusColors.cyan}
                    />
                    <Text numberOfLines={1} style={styles.metricValue}>
                      {stats.focusFormatted}
                    </Text>
                    <Text style={styles.metricLabel}>Foco Imersivo</Text>
                  </View>

                  {/* 3: Categoria Top */}
                  <View style={styles.metricTile}>
                    <Ionicons
                      name="star"
                      size={17}
                      color={MomentusColors.gold}
                    />
                    <Text numberOfLines={1} style={styles.metricValue}>
                      {stats.bestCategory}
                    </Text>
                    <Text style={styles.metricLabel}>Maior Foco</Text>
                  </View>

                  {/* 4: Evolução */}
                  <View style={styles.metricTile}>
                    <Ionicons
                      name={
                        stats.improvement >= 0 ? "trending-up" : "trending-down"
                      }
                      size={17}
                      color={
                        stats.improvement >= 0
                          ? primaryColor
                          : MomentusColors.errorRed
                      }
                    />
                    <Text style={styles.metricValue}>
                      {stats.improvement > 0
                        ? `+${stats.improvement}%`
                        : `${stats.improvement}%`}
                    </Text>
                    <Text style={styles.metricLabel}>Consistência</Text>
                  </View>
                </View>

                {/* Frase Motivacional */}
                <View style={styles.quoteBox}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={14}
                    color="rgba(255, 255, 255, 0.4)"
                  />
                  <Text style={styles.quoteText}>{motivationalQuote}</Text>
                </View>

                {/* Rodapé do Cartão com URL Oficial */}
                <View style={styles.cardFooter}>
                  <Text style={styles.footerTagline}>
                    Organize sua rotina. Vença o dia.
                  </Text>
                  <Text style={styles.footerLink}>app.momentusapp.com.br</Text>
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* Botões de Ação do Modal */}
          <View style={[styles.actionsContainer, { width: cardWidth }]}>
            <TouchableOpacity
              onPress={handleShare}
              disabled={isSharing}
              activeOpacity={0.85}
              style={[
                styles.primaryShareBtn,
                { backgroundColor: primaryColor },
                isSharing && styles.btnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Compartilhar resumo nos stories"
            >
              {isSharing ? (
                <ActivityIndicator
                  color={getContrastTextColor(primaryColor)}
                  size="small"
                />
              ) : (
                <>
                  <Ionicons
                    name="share-social"
                    size={18}
                    color={getContrastTextColor(primaryColor)}
                  />
                  <Text
                    style={[
                      styles.primaryShareBtnText,
                      { color: getContrastTextColor(primaryColor) },
                    ]}
                  >
                    Compartilhar nos Stories
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelActionBtn}
              accessibilityRole="button"
              accessibilityLabel="Fechar janela"
            >
              <Text style={styles.cancelActionBtnText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.88)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollWrapper: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  modalTopBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalTopBarTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardShadowWrapper: {
    borderRadius: BorderRadiusTokens.modal,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 12,
  },
  cardContainer: {
    borderRadius: BorderRadiusTokens.modal,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
    backgroundColor: "#070B18", // Garante que nunca haverá borda branca na captura
  },
  cardGradient: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    justifyContent: "space-between",
    position: "relative",
    backgroundColor: "#070B18",
  },
  ambientGlow: {
    position: "absolute",
    top: -60,
    left: "25%",
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.12,
    transform: [{ scale: 1.5 }],
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 6,
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
  },
  brandText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  brandDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  brandSub: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
  avatarInitial: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 3,
  },
  rankBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rankText: {
    fontSize: 10,
    fontWeight: "700",
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    marginVertical: 4,
  },
  heroCardGradient: {
    padding: 14,
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  heroIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroTextBox: {
    flex: 1,
  },
  heroLabel: {
    color: "#F8FAFC",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  heroSubLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "500",
  },
  heroScoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 2,
  },
  heroScoreNumber: {
    fontSize: 32,
    fontWeight: "900",
  },
  heroScoreTotal: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 4,
  },
  metricTile: {
    width: "48.5%",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 3,
  },
  metricValue: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
  metricLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
  },
  quoteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginVertical: 4,
  },
  quoteText: {
    flex: 1,
    color: "#CBD5E1",
    fontSize: 10,
    fontWeight: "500",
    fontStyle: "italic",
    lineHeight: 14,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  footerTagline: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "600",
  },
  footerLink: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "700",
  },
  actionsContainer: {
    marginTop: 16,
    gap: 10,
  },
  primaryShareBtn: {
    height: 52,
    borderRadius: BorderRadiusTokens.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryShareBtnText: {
    fontSize: 15,
    fontWeight: "800",
  },
  cancelActionBtn: {
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelActionBtnText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
});
